import { createHmac, timingSafeEqual } from "node:crypto";
export function validStripeSignature(
  raw: string,
  header: string | null,
  secret: string,
  now = Date.now() / 1000,
) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim()),
    timestamps = parts.filter((p) => p.startsWith("t="));
  if (timestamps.length !== 1) return false;
  const timestamp = timestamps[0].slice(2);
  if (
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(Number(timestamp)) ||
    Math.abs(now - Number(timestamp)) > 300
  )
    return false;
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex"),
  );
  return parts
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const candidate = Buffer.from(p.slice(3));
      return (
        expected.length === candidate.length &&
        timingSafeEqual(expected, candidate)
      );
    });
}
