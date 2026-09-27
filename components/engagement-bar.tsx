"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Heart, Loader2, MessageCircle, Send, Share2 } from "lucide-react";
import { clsx } from "clsx";

export type EngagementType =
  | "article"
  | "devotion"
  | "daily_feature"
  | "teaching"
  | "post"
  | "testimony"
  | "prayer";
type Comment = {
  id: string;
  author_name: string;
  author_avatar_url?: string | null;
  body: string;
  created_at: string;
};
type Props = {
  contentType: EngagementType;
  contentId: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  title: string;
  url: string;
  tone?: "default" | "dark";
  className?: string;
};

export function EngagementBar({
  contentType,
  contentId,
  likes = 0,
  comments = 0,
  shares = 0,
  views,
  title,
  url,
  tone = "default",
  className,
}: Props) {
  const [counts, setCounts] = useState({ likes, comments, shares });
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [requiresAuth, setRequiresAuth] = useState(false);
  const endpoint = `/api/engagement?contentType=${contentType}&contentId=${contentId}`;
  const muted = tone === "dark" ? "text-white/70" : "text-ink3";
  const button =
    tone === "dark"
      ? "bg-black/20 text-white hover:bg-black/30"
      : "bg-surface text-ink3 hover:bg-cream2";
  async function loadComments() {
    setOpen((value) => !value);
    if (loaded) return;
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setItems(result.comments || []);
      setCounts(result.counts);
      setLiked(result.liked);
      setRequiresAuth(!result.authenticated);
      setLoaded(true);
    } catch (problem) {
      setMessage(
        problem instanceof Error
          ? problem.message
          : "Comments could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function interact(
    action: "like" | "comment" | "share",
    extra: Record<string, string> = {},
  ) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, contentType, contentId, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) {
        setRequiresAuth(Boolean(result.requiresAuth));
        throw new Error(result.error);
      }
      setCounts(result.counts);
      setLiked(result.liked);
      if (result.comments) setItems(result.comments);
      if (action === "comment") {
        setBody("");
        setMessage(result.message);
      }
    } catch (problem) {
      setMessage(
        problem instanceof Error
          ? problem.message
          : "This interaction could not be saved.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function share() {
    const absolute = new URL(url, window.location.origin).toString();
    let channel = "copy";
    try {
      if (navigator.share) {
        await navigator.share({ title, url: absolute });
        channel = "native";
      } else {
        await navigator.clipboard.writeText(absolute);
        setMessage("Link copied.");
      }
      await interact("share", { channel });
    } catch (problem) {
      if ((problem as DOMException)?.name !== "AbortError")
        setMessage("The link could not be shared.");
    }
  }
  return (
    <div className={clsx("relative", className)} onClick={(e) => e.stopPropagation()}>
      <div className={clsx("flex flex-wrap items-center justify-center gap-2 text-xs", muted)}>
        {views !== undefined ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-2">
            <Eye size={14} /> {views.toLocaleString("en-US")}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void interact("like")}
          disabled={loading}
          className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-2 font-semibold transition",
            button,
            liked && "text-amber",
          )}
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />{" "}
          {counts.likes}
        </button>
        <button
          type="button"
          onClick={() => void loadComments()}
          className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-2 font-semibold transition",
            button,
          )}
        >
          <MessageCircle size={14} /> {counts.comments}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-2 font-semibold transition",
            button,
          )}
        >
          <Share2 size={14} /> {counts.shares}
        </button>
        {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      </div>
      {message ? (
        <p
          className={clsx(
            "mt-2 text-xs",
            tone === "dark" ? "text-white/75" : "text-ink3",
          )}
        >
          {message}{" "}
          {requiresAuth ? (
            <Link
              href="/community?compose=auth#join"
              className="font-bold text-amber"
            >
              Sign in
            </Link>
          ) : null}
        </p>
      ) : null}
      {open ? (
        <div
          className={clsx(
            "mt-3 border p-4",
            tone === "dark"
              ? "border-white/15 bg-black/30"
              : "border-border bg-cream2",
          )}
        >
          <div className="max-h-56 space-y-3 overflow-y-auto">
            {loading && !loaded ? (
              <p className={muted}>Loading comments…</p>
            ) : items.length ? (
              items.map((comment) => (
                <article
                  key={comment.id}
                  className={clsx(
                    "border-b pb-3 last:border-0",
                    tone === "dark" ? "border-white/10" : "border-border",
                  )}
                >
                  <p
                    className={clsx(
                      "text-xs font-bold",
                      tone === "dark" ? "text-white" : "text-ink",
                    )}
                  >
                    {comment.author_name}
                  </p>
                  <p className={clsx("mt-1 text-sm leading-6", muted)}>
                    {comment.body}
                  </p>
                </article>
              ))
            ) : (
              <p className={muted}>No approved comments yet.</p>
            )}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void interact("comment", { body });
            }}
          >
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write a comment…"
              maxLength={1500}
              className="field min-w-0 flex-1"
              required
            />
            <button
              className="grid size-12 shrink-0 place-items-center bg-amber text-white"
              aria-label="Submit comment"
            >
              <Send size={16} />
            </button>
          </form>
          <p className={clsx("mt-2 text-[0.68rem]", muted)}>
            Comments appear after administrator approval.
          </p>
        </div>
      ) : null}
    </div>
  );
}
