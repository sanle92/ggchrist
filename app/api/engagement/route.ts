import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const contentType = z.enum([
  "article",
  "devotion",
  "daily_feature",
  "teaching",
  "post",
  "testimony",
  "prayer",
]);
const targetSchema = z.object({ contentType, contentId: z.string().uuid() });
const actionSchema = targetSchema.extend({
  action: z.enum(["like", "comment", "share"]),
  body: z.string().trim().min(2).max(1500).optional(),
  channel: z
    .enum(["web", "native", "copy", "facebook", "whatsapp", "email"])
    .optional(),
});
const targetTables = {
  article: "articles",
  devotion: "devotions",
  daily_feature: "daily_features",
  teaching: "bible_teachings",
  post: "forum_posts",
  testimony: "testimonies",
  prayer: "prayer_requests",
} as const;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function engagementState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentTypeValue: keyof typeof targetTables,
  contentId: string,
  userId?: string,
) {
  const [{ data: target, error: targetError }, { data: comments, error: commentsError }, reaction] = await Promise.all([
    supabase
      .from(targetTables[contentTypeValue])
      .select("like_count,comment_count,share_count")
      .eq("id", contentId)
      .maybeSingle(),
    supabase
      .from("comments")
      .select("id,author_name,author_avatar_url,body,created_at")
      .eq("content_type", contentTypeValue)
      .eq("content_id", contentId)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100),
    userId
      ? supabase
          .from("content_reactions")
          .select("id")
          .eq("user_id", userId)
          .eq("content_type", contentTypeValue)
          .eq("content_id", contentId)
          .eq("reaction", "like")
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (targetError || commentsError || reaction.error || !target) throw new Error("Engagement state unavailable");
  return {
    counts: {
      likes: Number(target?.like_count || 0),
      comments: Number(target?.comment_count || 0),
      shares: Number(target?.share_count || 0),
    },
    comments: comments || [],
    liked: Boolean(reaction.data),
    authenticated: Boolean(userId),
  };
}

async function getEngagement(request: Request) {
  const url = new URL(request.url);
  const parsed = targetSchema.safeParse({
    contentType: url.searchParams.get("contentType"),
    contentId: url.searchParams.get("contentId"),
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid engagement target." },
      { status: 400 },
    );
  const supabase = await createClient();
  const [{ data: claims }, { data: available, error }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("is_public_engagement_target", {
      p_content_type: parsed.data.contentType,
      p_content_id: parsed.data.contentId,
    }),
  ]);
  if (error)
    return NextResponse.json(
      { error: "Engagement is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  if (!available)
    return NextResponse.json(
      { error: "This content is unavailable." },
      { status: 404 },
    );
  return NextResponse.json(
    await engagementState(
      supabase,
      parsed.data.contentType,
      parsed.data.contentId,
      claims?.claims?.sub,
    ),
  );
}

async function postEngagement(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Please check this interaction." },
      { status: 400 },
    );
  const input = parsed.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  const { data: available, error: targetError } = await supabase.rpc("is_public_engagement_target", {
    p_content_type: input.contentType, p_content_id: input.contentId,
  });
  if (targetError) throw new Error("Engagement target lookup failed");
  if (!available) return NextResponse.json({ error: "This content is unavailable." }, { status: 404 });

  if (input.action === "share") {
    const { error } = await supabase.rpc("record_content_share", {
      p_content_type: input.contentType,
      p_content_id: input.contentId,
      p_channel: input.channel || "web",
    });
    if (error)
      return NextResponse.json(
        {
          error: "This share could not be recorded. Please try again later.",
        },
        { status: 400 },
      );
    return NextResponse.json(
      await engagementState(supabase, input.contentType, input.contentId, userId),
    );
  }

  if (!userId)
    return NextResponse.json(
      { error: "Sign in to like or comment.", requiresAuth: true },
      { status: 401 },
    );
  if (input.action === "like") {
    const { data: existing, error: readError } = await supabase
      .from("content_reactions")
      .select("id")
      .eq("user_id", userId)
      .eq("content_type", input.contentType)
      .eq("content_id", input.contentId)
      .eq("reaction", "like")
      .maybeSingle();
    if (readError) {
      console.error("Like lookup failed", readError.code);
      return NextResponse.json({ error: "Likes are temporarily unavailable." }, { status: 503 });
    }
    const operation = existing
      ? supabase.from("content_reactions").delete().eq("id", existing.id)
      : supabase
          .from("content_reactions")
          .insert({
            user_id: userId,
            content_type: input.contentType,
            content_id: input.contentId,
            reaction: "like",
          });
    const { error } = await operation;
    if (error)
      return NextResponse.json(
        {
          error:
            "Your like could not be saved. Please try again later.",
        },
        { status: 400 },
      );
  }
  if (input.action === "comment") {
    if (!input.body)
      return NextResponse.json(
        { error: "Write a comment before submitting." },
        { status: 400 },
      );
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name,avatar_url,status")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.status === "banned")
      return NextResponse.json(
        { error: "This account cannot comment." },
        { status: 403 },
      );
    const { error } = await supabase
      .from("comments")
      .insert({
        user_id: userId,
        content_type: input.contentType,
        content_id: input.contentId,
        author_name: profile?.display_name || "Community member",
        author_avatar_url: profile?.avatar_url || null,
        body: input.body,
        status: "pending",
      });
    if (error)
      return NextResponse.json(
        {
          error:
            "Your comment could not be submitted. Please try again later.",
        },
        { status: 400 },
      );
  }
  const response = await engagementState(
    supabase,
    input.contentType,
    input.contentId,
    userId,
  );
  return NextResponse.json({
    ...response,
    message:
      input.action === "comment"
        ? "Your comment was submitted for approval."
        : undefined,
  });
}

// Return a usable JSON error even when authentication or a database read fails.
async function respond(handler: (request: Request) => Promise<NextResponse>, request: Request) {
  try { return await handler(request); }
  catch {
    console.error('Engagement request failed');
    return NextResponse.json({ error: 'Engagement is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
export async function GET(request: Request) { return respond(getEngagement, request); }
export async function POST(request: Request) { return respond(postEngagement, request); }
