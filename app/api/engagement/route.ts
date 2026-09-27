import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  contentTypeValue: keyof typeof targetTables,
  contentId: string,
  userId?: string,
) {
  const service = createServiceClient();
  const [{ data: target }, { data: comments }, reaction] = await Promise.all([
    service
      .from(targetTables[contentTypeValue])
      .select("like_count,comment_count,share_count")
      .eq("id", contentId)
      .maybeSingle(),
    service
      .from("comments")
      .select("id,author_name,author_avatar_url,body,created_at")
      .eq("content_type", contentTypeValue)
      .eq("content_id", contentId)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100),
    userId
      ? service
          .from("content_reactions")
          .select("id")
          .eq("user_id", userId)
          .eq("content_type", contentTypeValue)
          .eq("content_id", contentId)
          .eq("reaction", "like")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
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

export async function GET(request: Request) {
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
      { error: "Engagement requires Migration 011." },
      { status: 503 },
    );
  if (!available)
    return NextResponse.json(
      { error: "This content is unavailable." },
      { status: 404 },
    );
  return NextResponse.json(
    await engagementState(
      parsed.data.contentType,
      parsed.data.contentId,
      claims?.claims?.sub,
    ),
  );
}

export async function POST(request: Request) {
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

  if (input.action === "share") {
    const { error } = await supabase.rpc("record_content_share", {
      p_content_type: input.contentType,
      p_content_id: input.contentId,
      p_channel: input.channel || "web",
    });
    if (error)
      return NextResponse.json(
        {
          error: error.message.includes("function")
            ? "Sharing requires Migration 011."
            : "This share could not be recorded.",
        },
        { status: 400 },
      );
    return NextResponse.json(
      await engagementState(input.contentType, input.contentId, userId),
    );
  }

  if (!userId)
    return NextResponse.json(
      { error: "Sign in to like or comment.", requiresAuth: true },
      { status: 401 },
    );
  if (input.action === "like") {
    const { data: existing } = await supabase
      .from("content_reactions")
      .select("id")
      .eq("user_id", userId)
      .eq("content_type", input.contentType)
      .eq("content_id", input.contentId)
      .eq("reaction", "like")
      .maybeSingle();
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
            "Your like could not be saved. Confirm Migration 011 is installed.",
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
            "Your comment could not be submitted. Confirm Migration 011 is installed.",
        },
        { status: 400 },
      );
  }
  const response = await engagementState(
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
