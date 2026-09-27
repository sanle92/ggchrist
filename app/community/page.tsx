import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Flame,
  Hash,
  Heart,
  LockKeyhole,
  LogOut,
  MessageSquare,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { EngagementBar } from "@/components/engagement-bar";
import { GoogleAuthButton } from "@/components/google-auth-button";
import {
  createCommunityPost,
  createPrayerRequest,
  createTestimony,
  signIn,
  signOut,
  signUp,
} from "./actions";

export const metadata: Metadata = {
  title: "Christian Community",
  description:
    "Share encouragement, testimonies and prayer requests in a Christ-centered community.",
  alternates: { canonical: "/community" },
};
export const dynamic = "force-dynamic";

const forumCategories = [
  "All",
  "Faith",
  "Bible Study",
  "Life",
  "Family",
  "Ministry",
  "General",
];
const topics = [
  "Prayer",
  "Bible Study",
  "Worship",
  "Evangelism",
  "Devotionals",
  "Ministry",
  "Faith",
  "Family",
];

type CommunitySearch = {
  tab?: string;
  category?: string;
  compose?: string;
  authError?: string;
  authMessage?: string;
  postError?: string;
  postMessage?: string;
};

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-[1.4rem] border border-border bg-surface shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Composer({ userId, compose }: { userId?: string; compose?: string }) {
  if (!userId && compose === "auth")
    return (
      <Panel className="p-5 md:p-7">
        <div id="join" className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <GoogleAuthButton />
            <div className="mt-5 flex items-center gap-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink3">
              <span className="h-px flex-1 bg-border" />
              or continue with email
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
          <form
            action={signIn}
            className="rounded-2xl border border-border bg-cream2 p-5"
          >
            <LockKeyhole size={20} className="text-amber" />
            <h2 className="mt-4 font-serif text-2xl text-ink">Welcome back</h2>
            <p className="mt-2 text-sm text-ink3">
              Sign in to post, share testimony, and request prayer.
            </p>
            <div className="mt-5 grid gap-3">
              <input
                name="email"
                type="email"
                placeholder="Email address"
                className="field"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="field"
                required
              />
              <button className="btn-nav btn-amber">Sign in</button>
            </div>
          </form>
          <form
            action={signUp}
            className="rounded-2xl border border-border bg-cream2 p-5"
          >
            <ShieldCheck size={20} className="text-forest" />
            <h2 className="mt-4 font-serif text-2xl text-ink">
              Join the family
            </h2>
            <p className="mt-2 text-sm text-ink3">
              Create an account and take part in the community.
            </p>
            <div className="mt-5 grid gap-3">
              <input
                name="displayName"
                placeholder="Your name"
                className="field"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email address"
                className="field"
                required
              />
              <input
                name="password"
                type="password"
                minLength={8}
                placeholder="Password — at least 8 characters"
                className="field"
                required
              />
              <button className="btn-nav btn-forest">Create account</button>
            </div>
          </form>
        </div>
      </Panel>
    );

  if (userId && compose === "post")
    return (
      <Panel className="p-6">
        <form action={createCommunityPost}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">New discussion</p>
              <h2 className="mt-2 font-serif text-3xl text-ink">
                Share with the community
              </h2>
            </div>
            <Link
              href="/community"
              className="text-xs font-semibold text-ink3 hover:text-ink"
            >
              Cancel
            </Link>
          </div>
          <div className="mt-6 grid gap-3">
            <input
              name="title"
              placeholder="Topic or discussion title"
              className="field"
              required
            />
            <select name="category" className="field">
              <option>Faith</option>
              <option>Bible Study</option>
              <option>Life</option>
              <option>Family</option>
              <option>Ministry</option>
              <option>General</option>
            </select>
            <textarea
              name="content"
              rows={5}
              placeholder="What would you like to share?"
              className="field"
              required
            />
            <button className="btn-nav btn-amber justify-self-start">
              <Send size={15} /> Submit for review
            </button>
          </div>
        </form>
      </Panel>
    );

  if (userId && compose === "testimony")
    return (
      <Panel className="p-6">
        <form action={createTestimony}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Your testimony</p>
              <h2 className="mt-2 font-serif text-3xl text-ink">
                Tell what God has done
              </h2>
            </div>
            <Link
              href="/community?tab=testimonies"
              className="text-xs font-semibold text-ink3 hover:text-ink"
            >
              Cancel
            </Link>
          </div>
          <div className="mt-6 grid gap-3">
            <input
              name="title"
              placeholder="Testimony title"
              className="field"
              required
            />
            <input
              name="summary"
              placeholder="A short summary (optional)"
              className="field"
            />
            <select name="category" className="field">
              <option>Faith</option>
              <option>Healing</option>
              <option>Provision</option>
              <option>Salvation</option>
              <option>Family</option>
              <option>General</option>
            </select>
            <textarea
              name="content"
              rows={6}
              placeholder="Share your testimony…"
              className="field"
              required
            />
            <label className="flex items-center gap-2 text-sm text-ink3">
              <input
                type="checkbox"
                name="isAnonymous"
                className="accent-amber"
              />{" "}
              Share anonymously
            </label>
            <button className="btn-nav btn-amber justify-self-start">
              <Star size={15} /> Submit testimony
            </button>
          </div>
        </form>
      </Panel>
    );

  if (userId && compose === "prayer")
    return (
      <Panel className="p-6">
        <form action={createPrayerRequest}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Prayer request</p>
              <h2 className="mt-2 font-serif text-3xl text-ink">
                How can we pray for you?
              </h2>
            </div>
            <Link
              href="/community?tab=prayers"
              className="text-xs font-semibold text-ink3 hover:text-ink"
            >
              Cancel
            </Link>
          </div>
          <div className="mt-6 grid gap-3">
            <select name="category" className="field">
              <option>General</option>
              <option>Family</option>
              <option>Healing</option>
              <option>Guidance</option>
              <option>Salvation</option>
            </select>
            <textarea
              name="request"
              rows={6}
              placeholder="Share your prayer request…"
              className="field"
              required
            />
            <div className="flex flex-wrap gap-5 text-sm text-ink3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isAnonymous"
                  className="accent-forest"
                />{" "}
                Post anonymously
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isPrivate"
                  className="accent-forest"
                />{" "}
                Private to moderators
              </label>
            </div>
            <button className="btn-nav btn-forest justify-self-start">
              <Heart size={15} /> Submit prayer request
            </button>
          </div>
        </form>
      </Panel>
    );

  return (
    <Panel className="flex min-h-36 items-center justify-between gap-5 p-6 md:p-8">
      <div className="flex min-w-0 items-center gap-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border border-amber/25 bg-amber/8 text-amber">
          <UserRound size={22} />
        </span>
        <div>
          <p className="font-serif text-2xl text-ink">
            {userId
              ? "Share what is on your heart…"
              : "Join the family to post…"}
          </p>
          <p className="mt-1 text-sm text-ink3">
            {userId
              ? "Encourage someone, ask a question, or share your story."
              : "Sign in or create an account to join the conversation."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {userId ? (
          <>
            <Link
              href="/community?compose=post"
              className="btn-nav btn-amber hidden sm:inline-flex"
            >
              <PenLine size={15} /> New post
            </Link>
            <form action={signOut}>
              <button
                className="grid size-10 place-items-center rounded-full border border-border text-ink3 hover:text-ink"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/community?compose=auth#join"
            className="btn-nav btn-amber"
          >
            Join now
          </Link>
        )}
      </div>
    </Panel>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<CommunitySearch>;
}) {
  const query = await searchParams;
  const tab = ["forum", "testimonies", "prayers", "chat"].includes(
    query.tab || "",
  )
    ? query.tab!
    : "forum";
  const category = query.category || "All";
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const [
    { data: posts },
    { data: testimonies },
    { data: prayers },
    { data: feature },
  ] = await Promise.all([
    supabase
      .from("forum_posts")
      .select(
        "id, author_name, title, content, category, like_count, comment_count, share_count, created_at, status",
      )
      .is("deleted_at", null)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("testimonies")
      .select(
        "id, author_name, title, summary, content, category, like_count, comment_count, share_count, created_at, status",
      )
      .is("deleted_at", null)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("prayer_requests")
      .select(
        "id, author_name, request, category, is_anonymous, prayer_count, like_count, comment_count, share_count, created_at, status",
      )
      .is("deleted_at", null)
      .eq("is_private", false)
      .in("status", ["approved", "answered"])
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("daily_features")
      .select("verse_book, verse_chapter, featured_verse")
      .eq("status", "published")
      .order("feature_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const visiblePosts =
    category === "All"
      ? (posts ?? [])
      : (posts ?? []).filter(
          (post) => post.category.toLowerCase() === category.toLowerCase(),
        );
  const trending = [...(posts ?? [])]
    .sort(
      (a, b) =>
        b.like_count + b.comment_count - (a.like_count + a.comment_count),
    )
    .slice(0, 3);
  const verse =
    feature?.featured_verse ||
    "Bear ye one another’s burdens, and so fulfil the law of Christ.";
  const verseReference = feature
    ? `${feature.verse_book} ${feature.verse_chapter}`
    : "Galatians 6:2";
  const errorMessage = query.authError || query.postError;
  const successMessage = query.authMessage || query.postMessage;

  return (
    <main className="relative -mb-0 min-h-screen overflow-hidden bg-cream2 text-ink">
      <div className="ggc-shell relative py-14 md:py-20">
        <header className="mb-10 max-w-3xl">
          <p className="section-kicker">Faith · Fellowship · Prayer</p>
          <h1 className="mt-4 font-serif text-[clamp(3.3rem,7vw,6.6rem)] leading-[.92] tracking-[-.035em]">
            Community
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ink3">
            A Christ-centered place to ask, encourage, testify, and carry one
            another in prayer.
          </p>
        </header>
        {errorMessage ? (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="grid gap-6">
            <Composer userId={userId} compose={query.compose} />
            <Panel className="overflow-hidden">
              <nav className="flex overflow-x-auto border-b border-border px-4 md:px-6">
                {[
                  ["forum", Hash, "Forum", posts?.length || 0],
                  [
                    "testimonies",
                    Star,
                    "Testimonies",
                    testimonies?.length || 0,
                  ],
                  ["prayers", Heart, "Prayers", prayers?.length || 0],
                  ["chat", MessageSquare, "Chat", 0],
                ].map(([value, Icon, label, count]) => {
                  const TabIcon = Icon as typeof Hash;
                  const active = tab === value;
                  return (
                    <Link
                      key={String(value)}
                      href={`/community?tab=${value}`}
                      className={clsx(
                        "relative flex shrink-0 items-center gap-2 px-4 py-6 text-[0.72rem] font-bold uppercase tracking-[0.13em] transition",
                        active ? "text-amber" : "text-ink3 hover:text-ink",
                      )}
                    >
                      <TabIcon size={17} />
                      {String(label)}
                      {Number(count) > 0 ? (
                        <span className="rounded-full bg-forest/7 px-2 py-0.5 text-[0.6rem]">
                          {String(count)}
                        </span>
                      ) : null}
                      {active ? (
                        <span className="absolute inset-x-2 bottom-0 h-0.5 bg-amber" />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
              {tab === "forum" ? (
                <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-4">
                  {forumCategories.map((item) => (
                    <Link
                      key={item}
                      href={`/community?tab=forum&category=${encodeURIComponent(item)}`}
                      className={clsx(
                        "shrink-0 rounded-full border px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.1em] transition",
                        category === item
                          ? "border-amber bg-amber text-ink"
                          : "border-border text-ink3 hover:border-amber hover:text-ink3",
                      )}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="p-5 md:p-8">
                {tab === "forum" ? (
                  visiblePosts.length ? (
                    <div className="grid gap-4">
                      {visiblePosts.map((post) => (
                        <article
                          key={post.id}
                          id={`post-${post.id}`}
                          className="rounded-2xl border border-border bg-surface p-5 transition hover:border-amber"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="grid size-9 place-items-center rounded-full bg-forest/7 text-xs font-bold text-amber">
                                {post.author_name.slice(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-ink">
                                  {post.author_name}
                                </p>
                                <time className="text-[0.65rem] text-ink3">
                                  {new Date(
                                    post.created_at,
                                  ).toLocaleDateString()}
                                </time>
                              </div>
                            </div>
                            <span className="rounded-full border border-border px-3 py-1 text-[0.58rem] font-bold uppercase tracking-wider text-ink3">
                              {post.category}
                            </span>
                          </div>
                          {post.title ? (
                            <h2 className="mt-5 font-serif text-2xl text-ink">
                              {post.title}
                            </h2>
                          ) : null}
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/42">
                            {post.content}
                          </p>
                          <EngagementBar
                            className="mt-5"
                            contentType="post"
                            contentId={post.id}
                            likes={post.like_count}
                            comments={post.comment_count}
                            shares={post.share_count}
                            title={post.title || "Community discussion"}
                            url={`/community?tab=forum#post-${post.id}`}
                          />
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Hash}
                      title="No discussions yet"
                      description="Start a conversation with the community."
                      href={
                        userId
                          ? "/community?compose=post"
                          : "/community?compose=auth#join"
                      }
                      action="Start discussion"
                    />
                  )
                ) : null}
                {tab === "testimonies" ? (
                  testimonies?.length ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {testimonies.map((item) => (
                        <article
                          key={item.id}
                          id={`testimony-${item.id}`}
                          className="rounded-2xl border border-[#f59e0b]/12 bg-[#f59e0b]/[0.035] p-5"
                        >
                          <Star size={18} className="text-[#f59e0b]" />
                          <p className="mt-5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#f59e0b]">
                            {item.category}
                          </p>
                          <h2 className="mt-2 font-serif text-2xl text-ink/90">
                            {item.title}
                          </h2>
                          <p className="mt-3 line-clamp-4 text-sm leading-7 text-ink/40">
                            {item.summary || item.content}
                          </p>
                          <p className="mt-5 text-xs text-ink/55">
                            {item.author_name}
                          </p>
                          <EngagementBar
                            className="mt-4"
                            contentType="testimony"
                            contentId={item.id}
                            likes={item.like_count}
                            comments={item.comment_count}
                            shares={item.share_count}
                            title={item.title}
                            url={`/community?tab=testimonies#testimony-${item.id}`}
                          />
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Star}
                      title="No testimonies yet"
                      description="Be the first to share what God has done."
                      href={
                        userId
                          ? "/community?tab=testimonies&compose=testimony"
                          : "/community?compose=auth#join"
                      }
                      action="Share testimony"
                      accent="gold"
                    />
                  )
                ) : null}
                {tab === "prayers" ? (
                  prayers?.length ? (
                    <div
                      id="prayer-requests"
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      {prayers.map((prayer) => (
                        <article
                          key={prayer.id}
                          id={`prayer-${prayer.id}`}
                          className="rounded-2xl border border-[#a78bfa]/12 bg-[#a78bfa]/[0.035] p-5"
                        >
                          <Heart size={18} className="text-[#a78bfa]" />
                          <p className="mt-5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#a78bfa]">
                            {prayer.category}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-ink/48">
                            {prayer.request}
                          </p>
                          <p className="mt-5 text-xs text-ink/28">
                            {prayer.prayer_count} praying ·{" "}
                            {prayer.is_anonymous
                              ? "Anonymous"
                              : prayer.author_name}
                          </p>
                          <EngagementBar
                            className="mt-4"
                            contentType="prayer"
                            contentId={prayer.id}
                            likes={prayer.like_count}
                            comments={prayer.comment_count}
                            shares={prayer.share_count}
                            title="Prayer request"
                            url={`/community?tab=prayers#prayer-${prayer.id}`}
                          />
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Heart}
                      title="The prayer wall is quiet"
                      description="Share a request and let the community pray with you."
                      href={
                        userId
                          ? "/community?tab=prayers&compose=prayer"
                          : "/community?compose=auth#join"
                      }
                      action="Request prayer"
                      accent="purple"
                    />
                  )
                ) : null}
                {tab === "chat" ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Live chat is coming soon"
                    description="A safe, moderated real-time fellowship space is being prepared."
                    action="Return to forum"
                    href="/community?tab=forum"
                    accent="green"
                  />
                ) : null}
              </div>
            </Panel>
          </div>
          <aside className="grid gap-6">
            <Panel className="p-5">
              <p className="community-label text-ink3">Quick actions</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <QuickAction
                  href={
                    userId
                      ? "/community?compose=post"
                      : "/community?compose=auth#join"
                  }
                  icon={PenLine}
                  label="New post"
                  tone="coral"
                />
                <QuickAction
                  href={
                    userId
                      ? "/community?tab=testimonies&compose=testimony"
                      : "/community?compose=auth#join"
                  }
                  icon={Star}
                  label="Testimony"
                  tone="gold"
                />
                <QuickAction
                  href={
                    userId
                      ? "/community?tab=prayers&compose=prayer"
                      : "/community?compose=auth#join"
                  }
                  icon={Heart}
                  label="Prayer"
                  tone="purple"
                />
                <QuickAction
                  href="/community?tab=chat"
                  icon={MessageSquare}
                  label="Chat"
                  tone="green"
                />
              </div>
            </Panel>
            <Panel className="p-5">
              <p className="community-label flex items-center gap-2 text-ink3">
                <Flame size={14} className="text-amber" /> Trending this week
              </p>
              <div className="mt-5 grid gap-3">
                {trending.length ? (
                  trending.map((post, index) => (
                    <div
                      key={post.id}
                      className="flex gap-3 border-t border-white/7 pt-3 first:border-0 first:pt-0"
                    >
                      <span className="font-serif text-xl text-amber/60">
                        0{index + 1}
                      </span>
                      <div>
                        <p className="line-clamp-2 text-sm font-medium leading-5 text-ink3">
                          {post.title || post.content}
                        </p>
                        <p className="mt-1 text-[0.62rem] text-ink3">
                          {post.like_count + post.comment_count} interactions
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center font-serif italic text-ink3">
                    No posts yet this week
                  </p>
                )}
              </div>
            </Panel>
            <Panel className="p-5">
              <p className="community-label text-ink3">Explore topics</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Link
                    key={topic}
                    href={`/community?tab=forum&category=${encodeURIComponent(topic)}`}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink3 transition hover:border-amber hover:text-ink3"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </Panel>
            <section className="relative overflow-hidden rounded-[1.4rem] bg-[linear-gradient(145deg,#2a9464,#12543b)] p-7 shadow-[0_20px_55px_rgba(18,84,59,.22)]">
              <Sparkles size={18} className="text-[#ff8b78]" />
              <p className="mt-5 text-[0.63rem] font-bold uppercase tracking-[0.22em] text-[#ff9a88]">
                Verse of the day
              </p>
              <blockquote className="mt-5 font-serif text-2xl italic leading-8 text-white">
                “{verse}”
              </blockquote>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                {verseReference}
              </p>
              <BookOpen
                size={130}
                strokeWidth={0.7}
                className="pointer-events-none absolute -bottom-8 -right-7 text-white/[0.08]"
              />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  action,
  accent = "coral",
}: {
  icon: typeof Hash;
  title: string;
  description: string;
  href: string;
  action: string;
  accent?: "coral" | "gold" | "purple" | "green";
}) {
  const colors = {
    coral: "text-amber bg-amber/8",
    gold: "text-amber bg-amber/8",
    purple: "text-forest bg-forest/8",
    green: "text-forest bg-forest/8",
  };
  return (
    <div className="grid min-h-[390px] place-items-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <div>
        <span
          className={clsx(
            "mx-auto grid size-16 place-items-center rounded-full",
            colors[accent],
          )}
        >
          <Icon size={28} />
        </span>
        <h2 className="mt-7 font-serif text-3xl text-forest">{title}</h2>
        <p className="mt-3 font-serif text-lg italic text-ink3">
          {description}
        </p>
        <Link
          href={href}
          className={clsx(
            "mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-white",
            accent === "coral"
              ? "bg-amber"
              : accent === "gold"
                ? "bg-amber"
                : accent === "purple"
                  ? "bg-brand"
                  : "bg-brand",
          )}
        >
          <PenLine size={14} />
          {action}
        </Link>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: typeof PenLine;
  label: string;
  tone: "coral" | "gold" | "purple" | "green";
}) {
  const tones = {
    coral: "border-amber/20 bg-amber/7 text-amber",
    gold: "border-amber/18 bg-amber/7 text-amber",
    purple: "border-forest/18 bg-forest/7 text-forest",
    green: "border-forest/18 bg-forest/7 text-forest",
  };
  return (
    <Link
      href={href}
      className={clsx(
        "flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-center transition hover:-translate-y-0.5",
        tones[tone],
      )}
    >
      <Icon size={18} />
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.13em]">
        {label}
      </span>
    </Link>
  );
}
