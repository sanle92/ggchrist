import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export async function accessToken(id: string) {
  const key = process.env.GGC_SETTINGS_ENCRYPTION_KEY;
  if (!key || key.length < 32)
    throw new Error(
      "The shared settings encryption key is required for private receipt access",
    );
  return createHmac("sha256", key)
    .update(`giving-receipt:${id}`)
    .digest("base64url");
}
export function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("Site URL is required");
  return new URL(url).origin;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === siteUrl();
}
export async function rateLimit(key: string, limit = 20) {
  const { data, error } = await createServiceClient().rpc("giving_rate_limit", {
    p_key: hash(key),
    p_limit: limit,
  });
  if (error || !data)
    throw new Error("Please wait a few minutes before trying again.");
}
export async function privateDonation(token: string | null) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await createServiceClient()
    .from("donations")
    .select("*,campaigns(title)")
    .eq("access_token_hash", hash(token))
    .maybeSingle();
  if (error) throw error;
  return data;
}
