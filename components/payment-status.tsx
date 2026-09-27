"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export function PaymentStatus({ reference }: { reference?: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState(
    "Confirming your donation with Stripe…",
  );
  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setMessage("The checkout session is missing.");
      return;
    }
    fetch(`/api/stripe/session?session_id=${encodeURIComponent(reference)}`)
      .then(async (response) => ({
        ok: response.ok,
        body: await response.json(),
      }))
      .then(({ ok, body }) => {
        if (!ok || body.status !== "successful")
          throw new Error(body.error || `Payment status: ${body.status}`);
        setStatus("success");
        setMessage("Thank you. Stripe confirmed your donation successfully.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "We could not confirm this payment yet.");
      });
  }, [reference]);
  const Icon =
    status === "loading"
      ? Loader2
      : status === "success"
        ? CheckCircle2
        : XCircle;
  return (
    <div className="ggc-card mx-auto max-w-xl p-9 text-center">
      <span
        className={`mx-auto grid size-16 place-items-center rounded-full ${status === "success" ? "bg-green-50 text-green-700" : status === "error" ? "bg-red-50 text-red-700" : "bg-forest/8 text-forest"}`}
      >
        <Icon
          size={30}
          className={status === "loading" ? "animate-spin" : ""}
        />
      </span>
      <h1 className="mt-6 font-serif text-4xl">
        {status === "success"
          ? "Donation received"
          : status === "error"
            ? "Verification pending"
            : "Please wait"}
      </h1>
      <p className="mt-4 leading-7 text-ink3">{message}</p>
      <div className="mt-7 flex justify-center gap-3">
        <Link href="/" className="btn-nav btn-forest px-5 py-3">
          Return home
        </Link>
        {status === "error" ? (
          <Link
            href="/donate"
            className="btn-nav border border-forest/15 px-5 py-3 text-forest"
          >
            Try again
          </Link>
        ) : null}
      </div>
    </div>
  );
}
