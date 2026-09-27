"use client";
import { useEffect, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Heart, LockKeyhole, ArrowRight, Check, Loader2 } from "lucide-react";
import {
  amountMinor,
  givingSchema,
  contribution,
  currencies,
  money,
  presets,
  type Currency,
} from "@/lib/giving/shared";
import { GivingStatus } from "./giving-status";
export type GivingCampaign = {
  id: string;
  slug: string;
  title: string;
  description: string;
  currency: string;
  target_amount_minor: number;
  raised_amount_minor: number;
  donor_count: number;
  cover_image_url: string | null;
};
export function DonationForm({
  campaigns,
  purposes,
  publishableKey,
  initialCampaignId = "",
  defaultCurrency = "USD",
}: {
  campaigns: GivingCampaign[];
  purposes: string[];
  publishableKey: string | null;
  initialCampaignId?: string;
  defaultCurrency?: Currency;
}) {
  const [stripePromise] = useState(() =>
    publishableKey ? loadStripe(publishableKey).catch(() => null) : null,
  );
  const [currency, setCurrency] = useState<Currency>(
    (campaigns.find((c) => c.id === initialCampaignId)?.currency as Currency) ||
      defaultCurrency,
  );
  const [amount, setAmount] = useState(currency === "UGX" ? "50000" : "50");
  const [frequency, setFrequency] = useState<"one_time" | "monthly">(
    "one_time",
  );
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialElementsOptions] = useState({
    mode: "payment" as const,
    amount: currency === "UGX" ? 5000000 : 5000,
    currency: currency.toLowerCase(),
    paymentMethodTypes: ["card"],
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#142b3f",
        borderRadius: "12px",
        fontFamily: "system-ui, sans-serif",
      },
    },
  });
  useEffect(() => {
    const t = sessionStorage.getItem("ggc-giving-token");
    if (t) setToken(t);
  }, []);
  let minor = 0;
  try {
    minor = amountMinor(amount, currency);
  } catch {}
  if (token) return <GivingStatus token={token} />;
  const form = (
    <GiftFields
      campaigns={campaigns}
      purposes={purposes}
      initialCampaignId={initialCampaignId}
      amount={amount}
      setAmount={setAmount}
      currency={currency}
      setCurrency={setCurrency}
      frequency={frequency}
      setFrequency={setFrequency}
      minor={minor}
      available={!!stripePromise}
      busy={busy}
      setBusy={setBusy}
      onPaid={setToken}
    />
  );
  return stripePromise ? (
    <Elements stripe={stripePromise} options={initialElementsOptions}>
      {form}
    </Elements>
  ) : (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <p role="status">
        Online giving is temporarily unavailable. Please{" "}
        <a href="/contact" className="underline">
          contact the ministry
        </a>{" "}
        for help.
      </p>
    </div>
  );
}
function GiftFields(p: {
  campaigns: GivingCampaign[];
  purposes: string[];
  initialCampaignId: string;
  amount: string;
  setAmount: (v: string) => void;
  currency: Currency;
  setCurrency: (v: Currency) => void;
  frequency: "one_time" | "monthly";
  setFrequency: (v: "one_time" | "monthly") => void;
  minor: number;
  available: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onPaid: (t: string) => void;
}) {
  const stripe = useStripe(),
    elements = useElements();
  const [campaignId, setCampaignId] = useState(p.initialCampaignId),
    [purpose, setPurpose] = useState(
      p.purposes.includes("Where Needed Most")
        ? "Where Needed Most"
        : p.purposes[0] || "",
    );
  const [cover, setCover] = useState(false),
    [other, setOther] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false),
    [locked, setLocked] = useState(false);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(
      () =>
        setError(
          "Secure payment options are taking longer to load. Check your connection or contact the ministry if this continues.",
        ),
      20000,
    );
    return () => clearTimeout(timer);
  }, [ready]);
  const gate = useRef(false),
    attempt = useRef(""),
    bodyCache = useRef<Record<string, unknown> | null>(null),
    privateToken = useRef(""),
    requestCount = useRef(0);
  const campaign = p.campaigns.find((c) => c.id === campaignId);
  useEffect(() => {
    if (!elements) return;
    const syncTheme = () =>
      elements.update({
        appearance: {
          theme:
            document.documentElement.dataset.theme === "dark"
              ? "night"
              : "stripe",
          variables: {
            borderRadius: "12px",
            colorPrimary:
              document.documentElement.dataset.theme === "dark"
                ? "#ffb35c"
                : "#142b3f",
          },
        },
      });
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [elements]);
  const fee = cover ? contribution(p.minor, p.currency) : 0,
    total = p.minor + fee;
  useEffect(() => {
    elements?.update({
      mode: p.frequency === "monthly" ? "subscription" : "payment",
      amount: total || 1000000,
      currency: p.currency.toLowerCase(),
    });
  }, [elements, total, p.currency, p.frequency]);
  function changeCurrency(value: Currency) {
    p.setCurrency(value);
    p.setAmount("");
    setOther(true);
    setNotice(
      `Currency changed to ${value}. Please choose your gift amount again; no conversion has been made.`,
    );
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Snapshot fields before the loading state disables the fieldset.
    const fields = new FormData(e.currentTarget);
    if (gate.current || !stripe || !elements || !p.minor) return;
    gate.current = true;
    p.setBusy(true);
    setError("");
    try {
      const { error: validation } = await elements.submit();
      if (validation)
        throw new Error(
          validation.message || "Please check your payment details.",
        );
      if (!bodyCache.current) {
        const f = fields;
        attempt.current = crypto.randomUUID();
        const candidate = {
          attemptId: attempt.current,
          amount: p.amount,
          currency: p.currency,
          frequency: p.frequency,
          purpose,
          campaignId: campaignId || null,
          donorName: f.get("donorName"),
          donorEmail: f.get("donorEmail"),
          donorPhone: f.get("donorPhone") || "",
          country: f.get("country") || "",
          anonymous: f.get("anonymous") === "on",
          coverFees: cover,
          dedicationType: f.get("dedicationType") || "",
          dedicationName: f.get("dedicationName") || "",
          dedicationMessage: f.get("dedicationMessage") || "",
          prayerRequest: f.get("prayerRequest") || "",
          prayerTeamRequested: f.get("prayerTeamRequested") === "on",
        };
        const parsed = givingSchema.safeParse(candidate);
        if (!parsed.success)
          throw new Error(
            parsed.error.issues[0]?.message ||
              "Please check your gift details.",
          );
        bodyCache.current = parsed.data;
        setLocked(true);
      }
      requestCount.current += 1;
      const response = await fetch("/api/giving/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyCache.current),
      });
      const result = await response.json();
      if (!response.ok) {
        if (
          requestCount.current === 1 &&
          [400, 403].includes(response.status)
        ) {
          // These validation failures occur before a payment is initialized.
          bodyCache.current = null;
          requestCount.current = 0;
          setLocked(false);
        }
        throw new Error(result.error || "Your gift could not be prepared.");
      }
      privateToken.current = result.token;
      sessionStorage.setItem("ggc-giving-token", result.token);
      if (result.complete) {
        p.onPaid(result.token);
        return;
      }
      const confirmation = await stripe.confirmPayment({
        elements,
        clientSecret: result.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/donate/success`,
        },
        redirect: "if_required",
      });
      if (confirmation.error)
        throw new Error(
          confirmation.error.message ||
            "Please check your payment details and try again.",
        );
      p.onPaid(result.token);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "We could not complete your gift. Please try again.",
      );
    } finally {
      gate.current = false;
      p.setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="giving-form overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-shadow2"
      aria-label="Make a donation"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-6 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-ink3">
            A gift with eternal purpose
          </p>
          <h2 className="mt-2 font-serif text-3xl">Make your gift</h2>
        </div>
        <Heart className="text-amber" size={26} />
      </div>
      <div className="p-5 sm:p-8">
        <fieldset
          disabled={p.busy || locked}
          className="min-w-0 space-y-7 disabled:opacity-80"
        >
          <div>
            <div
              className="grid grid-cols-2 gap-1 rounded-2xl bg-cream2 p-1.5"
              aria-label="Giving frequency"
            >
              {(["one_time", "monthly"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={p.frequency === v}
                  onClick={() => p.setFrequency(v)}
                  className={`min-h-12 rounded-xl px-3 font-semibold ${p.frequency === v ? "bg-brand text-white shadow-sm" : "text-ink2"}`}
                >
                  {p.frequency === v ? (
                    <Check size={14} className="mr-2 inline" />
                  ) : null}
                  {v === "monthly" ? "Monthly" : "One-time"}
                </button>
              ))}
            </div>
            {p.frequency === "monthly" ? (
              <div className="mt-4 rounded-xl bg-cream p-4">
                <h3 className="font-serif text-xl">Become a Monthly Partner</h3>
                <p className="mt-1 text-sm leading-6 text-ink3">
                  Join those who faithfully support the ministry every month.
                  Your gift renews monthly until you cancel.
                </p>
              </div>
            ) : null}
          </div>
          <section aria-labelledby="amount-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="amount-heading" className="font-semibold">
                Choose your gift
              </h3>
              <label className="flex items-center gap-2 text-sm">
                Currency
                <select
                  aria-label="Donation currency"
                  value={p.currency}
                  disabled={!!campaign}
                  onChange={(e) => changeCurrency(e.target.value as Currency)}
                  className="rounded-lg border border-border bg-surface p-2"
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {presets(p.currency).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={!other && p.amount === String(v)}
                  onClick={() => {
                    p.setAmount(String(v));
                    setOther(false);
                  }}
                  className={`min-h-14 rounded-xl border px-2 text-sm font-semibold ${!other && p.amount === String(v) ? "border-brand bg-brand text-white" : "border-border hover:border-amber"}`}
                >
                  {money(v * 100, p.currency)}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={other}
              onClick={() => {
                setOther(true);
                p.setAmount("");
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border text-sm font-semibold"
            >
              Other amount
            </button>
            {other ? (
              <label className="mt-4 block text-sm font-semibold">
                Your amount ({p.currency})
                <input
                  className="field mt-2"
                  inputMode="decimal"
                  value={p.amount}
                  onChange={(e) => p.setAmount(e.target.value)}
                  required
                  placeholder={
                    p.currency === "UGX" ? "10,000 or more" : "1.00 or more"
                  }
                />
              </label>
            ) : null}
            <p aria-live="polite" className="mt-2 text-sm text-ink3">
              {notice}
              {other && p.amount && !p.minor
                ? ` Enter ${p.currency === "UGX" ? "UGX 10,000–5,000,000 in whole shillings" : "an amount from 1 to 10,000, with up to two decimal places"}.`
                : null}
            </p>
          </section>
          <section>
            <h3 className="font-semibold">Give To</h3>
            <label className="mt-3 block text-sm">
              Giving purpose
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="field mt-2"
              >
                {p.purposes.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {p.campaigns.length ? (
              <label className="mt-4 block text-sm">
                Campaign (optional)
                <select
                  className="field mt-2"
                  value={campaignId}
                  onChange={(e) => {
                    setCampaignId(e.target.value);
                    const c = p.campaigns.find((c) => c.id === e.target.value);
                    if (c && c.currency !== p.currency)
                      changeCurrency(c.currency as Currency);
                  }}
                >
                  <option value="">Support the ministry</option>
                  {p.campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {campaign ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                {campaign.cover_image_url ? (
                  <img
                    src={campaign.cover_image_url}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  <h4 className="font-serif text-xl">{campaign.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-ink3">
                    {campaign.description}
                  </p>
                  <progress
                    aria-label="Campaign funding progress"
                    className="mt-3 h-2 w-full accent-amber"
                    value={campaign.raised_amount_minor}
                    max={Math.max(
                      campaign.target_amount_minor,
                      campaign.raised_amount_minor,
                      1,
                    )}
                  />
                  <p className="mt-2 text-sm">
                    {money(campaign.raised_amount_minor, campaign.currency)}{" "}
                    raised of{" "}
                    {money(campaign.target_amount_minor, campaign.currency)}
                  </p>
                  <p className="mt-1 text-sm text-ink3">
                    {campaign.donor_count} donors ·{" "}
                    {money(
                      Math.max(
                        0,
                        campaign.target_amount_minor -
                          campaign.raised_amount_minor,
                      ),
                      campaign.currency,
                    )}{" "}
                    remaining
                  </p>
                </div>
              </div>
            ) : null}
          </section>
          <section>
            <h3 className="font-semibold">Your Information</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Full name
                <input
                  name="donorName"
                  autoComplete="name"
                  minLength={2}
                  maxLength={150}
                  required
                  className="field mt-2"
                />
              </label>
              <label className="text-sm">
                Email address
                <input
                  name="donorEmail"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  className="field mt-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Phone / WhatsApp <span className="text-ink3">(optional)</span>
                <input
                  name="donorPhone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  className="field mt-2"
                />
              </label>
              <label className="text-sm">
                Country code <span className="text-ink3">(optional)</span>
                <input
                  name="country"
                  autoComplete="country"
                  placeholder="e.g. UG"
                  maxLength={2}
                  pattern="[A-Za-z]{2}"
                  className="field mt-2"
                />
              </label>
            </div>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="anonymous"
                className="size-5 accent-amber"
              />
              Give anonymously
            </label>
            <p className="text-sm leading-6 text-ink3">
              Your contact details stay private. Anonymous gifts will not carry
              your name in public recognition.
            </p>
          </section>
          <div className="divide-y divide-border rounded-xl border border-border px-4">
            <details>
              <summary className="cursor-pointer py-4 font-semibold">
                Dedicate This Gift{" "}
                <span className="text-sm font-normal text-ink3">
                  — optional
                </span>
              </summary>
              <div className="space-y-3 pb-4">
                <label className="block text-sm">
                  Dedication
                  <select name="dedicationType" className="field mt-2">
                    <option value="">No dedication</option>
                    <option value="honor">In Honor Of</option>
                    <option value="memory">In Memory Of</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Person’s name
                  <input
                    name="dedicationName"
                    maxLength={150}
                    className="field mt-2"
                  />
                </label>
                <label className="block text-sm">
                  Dedication message
                  <textarea
                    name="dedicationMessage"
                    maxLength={1000}
                    rows={3}
                    className="field-area mt-2"
                  />
                </label>
              </div>
            </details>
            <details>
              <summary className="cursor-pointer py-4 font-semibold">
                Prayer Request{" "}
                <span className="text-sm font-normal text-ink3">
                  — optional
                </span>
              </summary>
              <label className="block text-sm">
                How can we pray for you?
                <textarea
                  name="prayerRequest"
                  maxLength={3000}
                  rows={4}
                  className="field-area mt-2"
                />
              </label>
              <label className="my-4 flex items-start gap-3 text-sm leading-6">
                <input
                  name="prayerTeamRequested"
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-amber"
                />
                I would like the ministry prayer team to pray for this request.
              </label>
              <p className="pb-4 text-sm text-ink3">
                Prayer requests are private and are never published.
              </p>
            </details>
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm leading-6">
            <input
              type="checkbox"
              checked={cover}
              onChange={(e) => setCover(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-amber"
            />
            <span>
              Help cover processing costs
              <strong className="block font-normal text-ink3">
                Optional 4% contribution
                {cover ? `: ${money(fee, p.currency)}` : ""}. This is a
                contribution, not an estimate of Stripe’s actual fee.
              </strong>
            </span>
          </label>
        </fieldset>
        <section className="mt-7" id="giving-payment">
          <h3 className="mb-4 font-semibold">Payment Method</h3>
          {!ready ? (
            <p
              role="status"
              className="mb-3 rounded-xl bg-cream p-4 text-sm text-ink3"
            >
              Loading secure payment options…
            </p>
          ) : null}
          <PaymentElement
            onReady={() => setReady(true)}
            onLoadError={() =>
              setError(
                "Secure payment could not load. Please check your connection and refresh.",
              )
            }
            options={{ layout: "tabs" }}
          />
          <p className="mt-3 text-sm text-ink3">
            Available cards and wallets are shown securely by Stripe.
          </p>
        </section>
        <section
          className="mt-7 rounded-xl bg-cream p-5"
          aria-label="Gift summary"
        >
          <h3 className="font-semibold">Your gift at a glance</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Donation</dt>
              <dd>{money(p.minor, p.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Purpose</dt>
              <dd className="text-right">{campaign?.title || purpose}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Frequency</dt>
              <dd>{p.frequency === "monthly" ? "Monthly" : "One-time"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Processing contribution</dt>
              <dd>{money(fee, p.currency)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-semibold">
              <dt>Total ({p.currency})</dt>
              <dd>{money(total, p.currency)}</dd>
            </div>
          </dl>
        </section>
        {locked ? (
          <p className="mt-4 text-sm text-ink3">
            Your gift details are reserved for this payment. You can retry the
            same payment securely.
          </p>
        ) : null}
        <div aria-live="polite" role="status">
          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={p.busy || !p.minor || !stripe || !ready}
          className="btn-nav btn-amber mt-5 min-h-14 w-full text-base disabled:cursor-wait disabled:opacity-60"
        >
          {p.busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Heart size={18} />
          )}{" "}
          {p.busy
            ? "Confirming your gift…"
            : `${p.frequency === "monthly" ? "Give" : "Donate"} ${money(total, p.currency)}${p.frequency === "monthly" ? " Monthly" : ""}`}{" "}
          {!p.busy ? <ArrowRight size={18} /> : null}
        </button>
        {error && privateToken.current ? (
          <button
            type="button"
            onClick={() => p.onPaid(privateToken.current)}
            className="mt-3 w-full min-h-11 underline"
          >
            Check payment status
          </button>
        ) : null}
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink3">
          <LockKeyhole size={14} />
          Secure giving, powered by Stripe
        </p>
      </div>
    </form>
  );
}
