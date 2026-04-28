"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell, { useAppContext } from "@/components/AppShell";
import { getUniversity } from "@/lib/universities";
import { useGate } from "@/components/GateModal";

interface Post {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { name: string };
  replies?: Reply[];
}

interface Reply {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { name: string };
}

const demoPosts: (Post & { replies: Reply[] })[] = [
  {
    id: 1, content: "Anyone else finding the IR2001 essay question really broad? Not sure where to start with the realism vs liberalism debate.", created_at: new Date(Date.now() - 3600000).toISOString(), user_id: "demo1",
    profiles: { name: "Sarah Mitchell" },
    replies: [
      { id: 101, content: "Start with Mearsheimer for realism and Keohane for liberalism — that's what Walsh recommended in the lecture.", created_at: new Date(Date.now() - 1800000).toISOString(), user_id: "demo2", profiles: { name: "James Chen" } },
      { id: 102, content: "The library has a great guide on structuring compare & contrast essays too!", created_at: new Date(Date.now() - 900000).toISOString(), user_id: "demo3", profiles: { name: "Olivia Brown" } },
    ]
  },
  {
    id: 2, content: "Just discovered that the Main Library has extended hours during revision week — open until midnight! 📚", created_at: new Date(Date.now() - 7200000).toISOString(), user_id: "demo3",
    profiles: { name: "Olivia Brown" }, replies: []
  },
  {
    id: 3, content: "Study group forming for PH1011 exam prep. We're meeting in the postgrad common room Tuesdays at 4pm. DM me if interested!", created_at: new Date(Date.now() - 86400000).toISOString(), user_id: "demo2",
    profiles: { name: "James Chen" }, replies: []
  },
];

function FeedInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { profile } = useAppContext();
  const { gate } = useGate();
  const userUni = profile?.university || "st-andrews";
  const uni = getUniversity(userUni);

  const [posts, setPosts] = useState<(Post & { replies: Reply[] })[]>([]);
  const [newPost, setNewPost] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (isDemo) { setPosts(demoPosts); setUserId("demo-self"); setUserName("Demo Student"); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    // Get user name
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
    if (profile) setUserName(profile.name);

    // Try to fetch posts filtered by university first; fall back to all posts if filtering fails
    // (handles missing/null university column gracefully)
    let postsData: unknown[] | null = null;
    const filtered = await supabase
      .from("feed_posts")
      .select("id, content, created_at, user_id, university, profiles(name)")
      .or(`university.eq.${userUni},university.is.null`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (filtered.error) {
      // Column probably doesn't exist — fetch all posts
      const all = await supabase
        .from("feed_posts")
        .select("id, content, created_at, user_id, profiles(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      postsData = all.data;
    } else {
      postsData = filtered.data;
    }

    if (postsData && postsData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postsWithReplies = await Promise.all((postsData as any[]).map(async (p) => {
        const { data: replies } = await supabase.from("feed_replies").select("id, content, created_at, user_id, profiles(name)").eq("post_id", p.id).order("created_at");
        const profileObj = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return { ...p, profiles: profileObj, replies: ((replies || []) as any[]).map((r: any) => ({ ...r, profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles })) } as Post & { replies: Reply[] };
      }));
      setPosts(postsWithReplies);
    } else {
      setPosts([]);
    }
    setLoading(false);
  }, [isDemo, userUni]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Realtime subscription for new posts
  useEffect(() => {
    if (isDemo) return;
    const channel = supabase.channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, () => { fetchPosts(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_replies" }, () => { fetchPosts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDemo, fetchPosts]);

  async function submitPost() {
    if (!gate("community")) return;
    if (!newPost.trim()) return;

    // Demo mode — add locally so users see the flow work
    if (isDemo) {
      const fresh: Post & { replies: Reply[] } = {
        id: Date.now(),
        content: newPost.trim(),
        created_at: new Date().toISOString(),
        user_id: "demo-self",
        profiles: { name: userName },
        replies: [],
      };
      setPosts(prev => [fresh, ...prev]);
      setNewPost("");
      return;
    }

    if (!userId) return;

    const content = newPost.trim();

    // Optimistic update — show post immediately so user sees it work
    const tempId = -Date.now();
    const optimistic: Post & { replies: Reply[] } = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_id: userId,
      profiles: { name: userName },
      replies: [],
    };
    setPosts(prev => [optimistic, ...prev]);
    setNewPost("");

    // Try with university column first; if it doesn't exist, retry without
    let saved = await supabase
      .from("feed_posts")
      .insert({ user_id: userId, content, university: userUni })
      .select("id, content, created_at, user_id")
      .single();
    if (saved.error) {
      const retry = await supabase
        .from("feed_posts")
        .insert({ user_id: userId, content })
        .select("id, content, created_at, user_id")
        .single();
      saved = retry;
    }
    if (saved.error) {
      // Insert failed — remove optimistic entry and tell the user
      setPosts(prev => prev.filter(p => p.id !== tempId));
      alert("Couldn't post: " + saved.error.message + "\n\nIf this keeps happening, the feed_posts table may need to be created in Supabase. Run MIGRATION_FEED.sql.");
      return;
    }
    // Replace temp post with saved post (using its real id)
    if (saved.data) {
      const realPost: Post & { replies: Reply[] } = {
        id: saved.data.id,
        content: saved.data.content,
        created_at: saved.data.created_at,
        user_id: saved.data.user_id,
        profiles: { name: userName },
        replies: [],
      };
      setPosts(prev => prev.map(p => p.id === tempId ? realPost : p));
    }
  }

  async function submitReply(postId: number) {
    if (!gate("community")) return;
    if (!replyText.trim()) return;

    // Demo mode — add locally
    if (isDemo) {
      const fresh: Reply = {
        id: Date.now(),
        content: replyText.trim(),
        created_at: new Date().toISOString(),
        user_id: "demo-self",
        profiles: { name: userName },
      };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: [...p.replies, fresh] } : p));
      setReplyText(""); setReplyTo(null);
      return;
    }

    if (!userId) return;

    const content = replyText.trim();
    const tempId = -Date.now();
    const optimistic: Reply = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_id: userId,
      profiles: { name: userName },
    };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: [...p.replies, optimistic] } : p));
    setReplyText(""); setReplyTo(null);

    const { data, error } = await supabase
      .from("feed_replies")
      .insert({ post_id: postId, user_id: userId, content })
      .select("id, content, created_at, user_id")
      .single();
    if (error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: p.replies.filter(r => r.id !== tempId) } : p));
      alert("Couldn't reply: " + error.message);
      return;
    }
    if (data) {
      const real: Reply = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        profiles: { name: userName },
      };
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, replies: p.replies.map(r => r.id === tempId ? real : r) } : p));
    }
  }

  async function deletePost(postId: number) {
    if (!gate("community")) return;
    if (!confirm("Delete this post?")) return;
    if (isDemo) { setPosts(prev => prev.filter(p => p.id !== postId)); return; }
    await supabase.from("feed_posts").delete().eq("id", postId);
    fetchPosts();
  }

  if (loading) return null;

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function initial(name: string) { return name ? name.charAt(0).toUpperCase() : "?"; }

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Uni feed</h1>
        <p className="page-sub">What&apos;s happening at {uni?.name || "your university"}.</p>

        {/* New post */}
        <div className="card mb">
          <div className="field" style={{ marginBottom: 12 }}>
            <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share something with your uni..." maxLength={2000} style={{ minHeight: 80 }} />
          </div>
          <button className="btn btn-grad" onClick={submitPost}>Post</button>
        </div>

        {/* Posts */}
        {posts.length ? posts.map(p => (
          <div key={p.id} className="feed-post">
            <div className="feed-post-header">
              <div className="avatar">{initial(p.profiles?.name || "")}</div>
              <div>
                <div className="feed-name">{p.profiles?.name || "Unknown"}</div>
                <div className="feed-time">{timeAgo(p.created_at)}</div>
              </div>
            </div>
            <div className="feed-post-body">{p.content}</div>
            <div className="feed-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => { setReplyTo(replyTo === p.id ? null : p.id); setReplyText(""); }}>
                {replyTo === p.id ? "Cancel" : `Reply${p.replies.length ? ` (${p.replies.length})` : ""}`}
              </button>
              {p.user_id === userId && <button className="btn btn-danger btn-sm" onClick={() => deletePost(p.id)}>Delete</button>}
            </div>
            {/* Replies */}
            {p.replies.length > 0 && (
              <div className="feed-reply-list">
                {p.replies.map(r => (
                  <div key={r.id} className="feed-reply">
                    <div className="avatar">{initial(r.profiles?.name || "")}</div>
                    <div className="feed-reply-content">
                      <span className="feed-reply-name">{r.profiles?.name || "Unknown"}</span>
                      <span className="feed-time" style={{ marginLeft: 8 }}>{timeAgo(r.created_at)}</span>
                      <div className="feed-reply-text">{r.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Reply input */}
            {replyTo === p.id && (
              <div className="chat-input-row" style={{ marginTop: 12 }}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitReply(p.id); } }} />
                <button className="btn btn-sm" onClick={() => submitReply(p.id)}>Reply</button>
              </div>
            )}
          </div>
        )) : <div className="empty">No posts yet. Be the first to share something!</div>}
      </div>
    </AppShell>
  );
}

export default function FeedPage() { return <Suspense><FeedInner /></Suspense>; }
