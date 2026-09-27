"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const authSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export async function signIn(formData: FormData) {
  const parsed = authSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/community?authError=Enter%20a%20valid%20email%20and%20password");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/community?authError=Invalid%20email%20or%20password");
  redirect("/community");
}

export async function signUp(formData: FormData) {
  const parsed = authSchema
    .extend({ displayName: z.string().trim().min(2).max(100) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      "/community?authError=Please%20check%20your%20registration%20details",
    );
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error)
    redirect(`/community?authError=${encodeURIComponent(error.message)}`);
  redirect(
    "/community?authMessage=Check%20your%20email%20to%20confirm%20your%20account",
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/community");
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/community?authError=Please%20sign%20in%20first");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .single();
  return { supabase, userId, profile };
}

export async function createCommunityPost(formData: FormData) {
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(180),
      content: z.string().trim().min(5).max(5000),
      category: z.string().trim().min(1).max(80),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/community?postError=Please%20check%20your%20post");
  const { supabase, userId, profile } = await requireUser();
  const { error } = await supabase.from("forum_posts").insert({
    user_id: userId,
    author_name: profile?.display_name || "Community member",
    author_avatar_url: profile?.avatar_url || null,
    title: parsed.data.title,
    content: parsed.data.content,
    category: parsed.data.category,
    status: "pending",
  });
  if (error)
    redirect("/community?postError=Your%20post%20could%20not%20be%20submitted");
  revalidatePath("/community");
  redirect(
    "/community?postMessage=Your%20post%20was%20submitted%20for%20review",
  );
}

export async function createPrayerRequest(formData: FormData) {
  const parsed = z
    .object({
      request: z.string().trim().min(5).max(5000),
      category: z.string().trim().min(1).max(80),
      isAnonymous: z.string().optional(),
      isPrivate: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/community?postError=Please%20check%20your%20prayer%20request");
  const { supabase, userId, profile } = await requireUser();
  const { error } = await supabase.from("prayer_requests").insert({
    user_id: userId,
    author_name: profile?.display_name || "Community member",
    author_avatar_url: profile?.avatar_url || null,
    request: parsed.data.request,
    category: parsed.data.category,
    is_anonymous: parsed.data.isAnonymous === "on",
    is_private: parsed.data.isPrivate === "on",
    status: "pending",
  });
  if (error)
    redirect(
      "/community?postError=Your%20prayer%20request%20could%20not%20be%20submitted",
    );
  revalidatePath("/community");
  redirect(
    "/community?postMessage=Your%20prayer%20request%20was%20submitted%20for%20review",
  );
}

export async function createTestimony(formData: FormData) {
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(180),
      summary: z.string().trim().max(300),
      content: z.string().trim().min(10).max(8000),
      category: z.string().trim().min(1).max(80),
      isAnonymous: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      "/community?tab=testimonies&compose=testimony&postError=Please%20check%20your%20testimony",
    );
  const { supabase, userId, profile } = await requireUser();
  const anonymous = parsed.data.isAnonymous === "on";
  const { error } = await supabase.from("testimonies").insert({
    user_id: userId,
    author_name: anonymous
      ? "Anonymous"
      : profile?.display_name || "Community member",
    author_avatar_url: anonymous ? null : profile?.avatar_url || null,
    title: parsed.data.title,
    summary: parsed.data.summary,
    content: parsed.data.content,
    category: parsed.data.category,
    is_anonymous: anonymous,
    status: "pending",
  });
  if (error)
    redirect(
      "/community?tab=testimonies&compose=testimony&postError=Your%20testimony%20could%20not%20be%20submitted",
    );
  revalidatePath("/community");
  redirect(
    "/community?tab=testimonies&postMessage=Your%20testimony%20was%20submitted%20for%20review",
  );
}
