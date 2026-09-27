"use client";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { money } from "@/lib/giving/shared";
export function GivingStatus({ token: provided }: { token?: string }) {
  const [token, setToken] = useState(provided || ""),
    [gift, setGift] = useState<any>(null),
    [error, setError] = useState(""),
    [poll, setPoll] = useState(0);
  useEffect(() => {
    if (!provided) setToken(sessionStorage.getItem("ggc-giving-token") || "");
  }, [provided]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>,
      count = 0;
    async function check() {
      try {
        const r = await fetch(
          `/api/giving/status?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (cancelled) return;
        setGift(d);
        if (!["successful", "refunded"].includes(d.status) && count++ < 30)
          timer = setTimeout(check, 2000);
      } catch {
        if (!cancelled)
          setError(
            "We could not check your gift yet. Please keep your payment reference and try again.",
          );
      }
    }
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, poll]);
  const paid = gift?.status === "successful" || gift?.status === "refunded";
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 text-center sm:p-9">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-amber/10 text-amber">
        {paid ? <Heart /> : <Loader2 className="animate-spin" />}
      </span>
      <h1 className="mt-5 font-serif text-4xl">
        {paid ? "Thank You ❤️" : "Confirming your gift"}
      </h1>
      <p className="mt-4 leading-7 text-ink3">
        {paid
          ? "Your gift has been received. May God richly bless you for supporting the work of the Gospel."
          : "We will show your confirmation as soon as your payment has been verified. Please avoid starting another gift while this payment is pending."}
      </p>
      {!token ? (
        <p className="mt-4">
          Please open the private receipt link in your confirmation email, or
          contact the ministry for help.
        </p>
      ) : null}
      {gift ? (
        <dl className="my-6 space-y-3 text-left">
          {[
            ["Reference", gift.reference],
            ["Total", money(gift.amount, gift.currency)],
            ["Purpose", gift.campaign || gift.purpose],
            [
              "Frequency",
              gift.frequency === "monthly" ? "Monthly" : "One-time",
            ],
            [
              "Date",
              gift.date ? new Date(gift.date).toLocaleString() : "Pending",
            ],
            ["Status", gift.status],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"
            >
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {paid && gift.frequency === "monthly" ? (
        <p className="my-4 font-semibold">
          Thank you for becoming a Monthly Partner.
        </p>
      ) : null}
      <p role="status">{error}</p>
      <div className="mt-6 grid gap-3">
        {paid ? (
          <a
            href={`/api/giving/receipt?token=${encodeURIComponent(token)}`}
            className="btn-nav btn-amber"
          >
            Download Receipt
          </a>
        ) : (
          <button
            className="btn-nav btn-amber"
            onClick={() => {
              setError("");
              setPoll((v) => v + 1);
            }}
          >
            Check again
          </button>
        )}
        <a href="/" className="btn-nav btn-outline">
          Return Home
        </a>
        {paid ? (
          <>
            <button
              className="btn-nav btn-outline"
              onClick={async () => {
                if (navigator.share)
                  await navigator
                    .share({
                      title: "Glorious Gospel of Christ",
                      url: window.location.origin,
                    })
                    .catch(() => {});
                else {
                  await navigator.clipboard.writeText(window.location.origin);
                  setError("GGChrist link copied.");
                }
              }}
            >
              Share GGChrist
            </button>
            <a href="/contact" className="underline">
              Submit Prayer Request
            </a>
            {gift.frequency === "monthly" ? (
              <a href="/giving/manage" className="underline">
                Manage monthly giving
              </a>
            ) : null}
            <button
              className="mt-3 text-sm underline"
              onClick={() => {
                sessionStorage.removeItem("ggc-giving-token");
                window.location.assign("/donate");
              }}
            >
              Make another gift
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
