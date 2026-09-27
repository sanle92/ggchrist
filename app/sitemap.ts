import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const staticPaths = [
    "",
    "/devotions",
    "/bible-teachings",
    "/bible-kids",
    "/daily-features",
    "/articles",
    "/community",
    "/ebooks",
    "/about",
    "/contact",
    "/donate",
  ];
  const supabase = await createClient();
  const [{ data: articles }, { data: devotions }, { data: teachings }, { data: kids }, { data: ebooks }, { data: features }] =
    await Promise.all([
      supabase
        .from("articles")
        .select("slug, updated_at")
        .eq("status", "published"),
      supabase
        .from("devotions")
        .select("slug, updated_at")
        .eq("status", "published"),
      supabase
        .from("bible_teachings")
        .select("slug, updated_at")
        .eq("status", "published"),
      supabase.from("kids_lessons").select("slug, updated_at").eq("status", "published").is("deleted_at", null),
      supabase.from("ebooks").select("slug, updated_at").eq("status", "published"),
      supabase.from("daily_features").select("feature_date, updated_at").eq("status", "published"),
    ]);

  return [
    ...staticPaths.map((path) => ({
      url: `${NEXT_PUBLIC_SITE_URL}${path}`,
      lastModified: new Date(),
    })),
    ...(articles ?? []).map((item) => ({
      url: `${NEXT_PUBLIC_SITE_URL}/articles/${item.slug}`,
      lastModified: item.updated_at,
    })),
    ...(devotions ?? []).map((item) => ({
      url: `${NEXT_PUBLIC_SITE_URL}/devotions/${item.slug}`,
      lastModified: item.updated_at,
    })),
    ...(teachings ?? []).map((item) => ({
      url: `${NEXT_PUBLIC_SITE_URL}/bible-teachings/${item.slug}`,
      lastModified: item.updated_at,
    })),
    ...(kids ?? []).map((item) => ({ url: `${NEXT_PUBLIC_SITE_URL}/bible-kids/${item.slug}`, lastModified: item.updated_at })),
    ...(ebooks ?? []).map((item) => ({ url: `${NEXT_PUBLIC_SITE_URL}/ebooks/${item.slug}`, lastModified: item.updated_at })),
    ...(features ?? []).map((item) => ({ url: `${NEXT_PUBLIC_SITE_URL}/daily-features/${item.feature_date}`, lastModified: item.updated_at })),
  ];
}
