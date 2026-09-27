import "server-only";

import { createDecipheriv, createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export type ApiSecretKey =
  | "stripe_publishable_key"
  | "stripe_secret_key"
  | "stripe_webhook_secret"
  | "resend_api_key";

function encryptionKey() {
  const source = process.env.GGC_SETTINGS_ENCRYPTION_KEY;
  if (!source || source.length < 32)
    throw new Error(
      "GGC_SETTINGS_ENCRYPTION_KEY must contain at least 32 characters",
    );
  return createHash("sha256").update(source, "utf8").digest();
}

function decryptSecret(payload: string) {
  const [version, iv, tag, encrypted] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted)
    throw new Error("The stored API credential has an invalid format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getApiSecret(key: ApiSecretKey) {
  const names: Record<ApiSecretKey, string> = {
    stripe_publishable_key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    stripe_secret_key: "STRIPE_SECRET_KEY",
    stripe_webhook_secret: "STRIPE_WEBHOOK_SECRET",
    resend_api_key: "RESEND_API_KEY",
  };
  if (process.env[names[key]]) return process.env[names[key]]!;
  const { data, error } = await createServiceClient()
    .from("api_secrets")
    .select("encrypted_value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  if (!data?.encrypted_value)
    throw new Error(
      `${key.replaceAll("_", " ")} is not configured in Admin Settings`,
    );
  return decryptSecret(data.encrypted_value);
}
