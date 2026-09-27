import { z } from "zod";
export const currencies = ["USD", "UGX", "EUR", "GBP"] as const;
export type Currency = (typeof currencies)[number];
export const purposes = [
  "Where Needed Most",
  "General Ministry",
  "Gospel Outreach",
  "Missions",
  "Media & Online Ministry",
  "Bible Teaching & Devotions",
  "Community Support",
  "Ministry Projects",
];
export const presets = (currency: string) =>
  currency === "UGX"
    ? [10000, 25000, 50000, 100000, 250000, 500000]
    : [5, 10, 25, 50, 100, 250];
// All stored amounts use Stripe's hundredths, including UGX's special API representation.
export function amountMinor(amount: string, currency: string) {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount))
    throw new Error("Enter a valid donation amount.");
  const [whole, fraction = ""] = amount.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    !currencies.includes(currency as Currency) ||
    !Number.isSafeInteger(value) ||
    value < (currency === "UGX" ? 1000000 : 100) ||
    value > (currency === "UGX" ? 500000000 : 1000000) ||
    (currency === "UGX" && value % 100)
  )
    throw new Error(
      currency === "UGX"
        ? "Give UGX 10,000–5,000,000 in whole shillings."
        : "Give an amount between 1 and 10,000.",
    );
  return value;
}
export const contribution = (amount: number, currency: string) =>
  currency === "UGX"
    ? Math.ceil((amount * 4) / 10000) * 100
    : Math.ceil((amount * 4) / 100);
export const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UGX" ? 0 : 2,
  }).format(minor / 100);
export const givingSchema = z
  .object({
    attemptId: z.string().uuid(),
    amount: z.string().max(12),
    currency: z.enum(currencies),
    frequency: z.enum(["one_time", "monthly"]),
    purpose: z.string().trim().min(1).max(100),
    campaignId: z.string().uuid().nullable(),
    donorName: z.string().trim().min(2).max(150),
    donorEmail: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    donorPhone: z
      .string()
      .trim()
      .max(40)
      .regex(/^[+\d\s().-]*$/)
      .default(""),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Z]{2})?$/)
      .default(""),
    anonymous: z.boolean(),
    coverFees: z.boolean(),
    dedicationType: z.enum(["", "honor", "memory"]),
    dedicationName: z.string().trim().max(150),
    dedicationMessage: z.string().trim().max(1000),
    prayerRequest: z.string().trim().max(3000),
    prayerTeamRequested: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.dedicationType && !v.dedicationName)
      ctx.addIssue({
        code: "custom",
        message: "Enter a dedication name.",
        path: ["dedicationName"],
      });
  });
