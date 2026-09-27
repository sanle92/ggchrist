"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";

type State = {
  status: "loading" | "success" | "error";
  message: string;
  title?: string;
  downloadUrl?: string;
};
export function EbookPaymentStatus({
  sessionId,
  freeToken,
}: {
  sessionId?: string;
  freeToken?: string;
}) {
  const [state, setState] = useState<State>({
    status: "loading",
    message: "Confirming your ebook order with Stripe…",
  });
  useEffect(() => {
    if (freeToken) {
      setState({
        status: "success",
        message: "Your free ebook is ready.",
        downloadUrl: `/api/ebooks/download?token=${encodeURIComponent(freeToken)}`,
      });
      return;
    }
    if (!sessionId) {
      setState({
        status: "error",
        message: "The checkout session is missing.",
      });
      return;
    }
    let attempts = 0;
    let timer: number | undefined;
    const check = async () => {
      attempts += 1;
      const response = await fetch(
        `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (
        response.ok &&
        body.status === "successful" &&
        body.kind === "ebook"
      ) {
        setState({
          status: "success",
          message: body.physical
            ? "Payment confirmed. Your order is now being prepared for delivery."
            : "Payment confirmed. Your protected ebook is ready to download.",
          title: body.title,
          downloadUrl: body.download_url,
        });
        return true;
      }
      if (attempts >= 8)
        throw new Error(
          body.error ||
            "Stripe confirmed payment, but fulfillment is still being prepared. Please check your email shortly.",
        );
      return false;
    };
    const run = async () => {
      try {
        if (await check()) return;
        timer = window.setInterval(async () => {
          try {
            if ((await check()) && timer) window.clearInterval(timer);
          } catch (error) {
            if (timer) window.clearInterval(timer);
            setState({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "We could not confirm this order yet.",
            });
          }
        }, 1500);
      } catch (error) {
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "We could not confirm this order yet.",
        });
      }
    };
    void run();
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [sessionId, freeToken]);
  const Icon =
    state.status === "loading"
      ? Loader2
      : state.status === "success"
        ? CheckCircle2
        : XCircle;
  return (
    <div className="ggc-card mx-auto max-w-xl p-9 text-center">
      <span
        className={`mx-auto grid size-16 place-items-center rounded-full ${state.status === "success" ? "bg-green-50 text-green-700" : state.status === "error" ? "bg-red-50 text-red-700" : "bg-forest/8 text-forest"}`}
      >
        <Icon
          size={30}
          className={state.status === "loading" ? "animate-spin" : ""}
        />
      </span>
      <h1 className="mt-6 font-serif text-4xl">
        {state.status === "success"
          ? state.title || "Your ebook is ready"
          : state.status === "error"
            ? "Order verification pending"
            : "Please wait"}
      </h1>
      <p className="mt-4 leading-7 text-ink3">{state.message}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {state.downloadUrl ? (
          <a href={state.downloadUrl} className="btn-nav btn-amber px-5 py-3">
            <Download size={16} /> Download ebook
          </a>
        ) : null}
        <Link href="/ebooks" className="btn-nav btn-forest px-5 py-3">
          Return to library
        </Link>
      </div>
    </div>
  );
}
