"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Thread {
  partnerId: string;
  partnerName: string;
  partnerUni?: string;
  partnerAvatar?: string | null;
  lastMessage: string;
  lastAt: string;
  unread: boolean;
}

interface DM {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  senderName?: string;
}

interface PublicProfile {
  id: string;
  name: string;
  university: string;
  course: string;
  year_of_study: string;
  avatar_url: string | null;
}

const demoThreads: Thread[] = [
  { partnerId: "demo1", partnerName: "Sarah Mitchell", partnerUni: "University of St Andrews", lastMessage: "Thanks for the Plato notes! Really helpful.", lastAt: new Date(Date.now() - 1800000).toISOString(), unread: true },
  { partnerId: "demo2", partnerName: "James Chen", partnerUni: "University of St Andrews", lastMessage: "See you at the study group on Tuesday!", lastAt: new Date(Date.now() - 86400000).toISOString(), unread: false },
];

const demoFriends: PublicProfile[] = [
  { id: "demo1", name: "Sarah Mitchell", university: "st-andrews", course: "Philosophy", year_of_study: "2nd Year", avatar_url: null },
  { id: "demo2", name: "James Chen", university: "st-andrews", course: "International Relations", year_of_study: "3rd Year", avatar_url: null },
];

const demoPeople: PublicProfile[] = [
  { id: "demo3", name: "Olivia Brown", university: "st-andrews", course: "History", year_of_study: "1st Year", avatar_url: null },
  { id: "demo4", name: "Liam Patel", university: "warwick", course: "Economics", year_of_study: "2nd Year", avatar_url: null },
];

const demoConversation: DM[] = [
  { id: 1, sender_id: "demo1", receiver_id: "demo-self", content: "Hey! Did you get the reading list for week 5?", read: true, created_at: new Date(Date.now() - 7200000).toISOString(), senderName: "Sarah Mitchell" },
  { id: 2, sender_id: "demo-self", receiver_id: "demo1", content: "Yeah, I'll share my notes with you. The Plato section is really dense.", read: true, created_at: new Date(Date.now() - 5400000).toISOString(), senderName: "Demo Student" },
  { id: 3, sender_id: "demo1", receiver_id: "demo-self", content: "Thanks for the Plato notes! Really helpful.", read: false, created_at: new Date(Date.now() - 1800000).toISOString(), senderName: "Sarah Mitchell" },
];

type Tab = "messages" | "friends" | "find";

function MessagesInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [tab, setTab] = useState<Tab>("messages");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PublicProfile[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [profilePreview, setProfilePreview] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    if (isDemo) {
      setThreads(demoThreads);
      setFriends(demoFriends);
      setUserId("demo-self");
      setUserName("Demo Student");
      setLoading(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
    if (profile) setUserName(profile.name);

    // Threads (DMs)
    const { data: dms } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });
    if (dms && dms.length > 0) {
      const threadMap: Record<string, { partnerId: string; lastMessage: string; lastAt: string; unread: boolean }> = {};
      for (const dm of dms) {
        const partnerId = dm.sender_id === session.user.id ? dm.receiver_id : dm.sender_id;
        if (!threadMap[partnerId]) {
          threadMap[partnerId] = { partnerId, lastMessage: dm.content, lastAt: dm.created_at, unread: dm.receiver_id === session.user.id && !dm.read };
        }
      }
      const partnerIds = Object.keys(threadMap);
      const { data: partners } = await supabase.from("profiles").select("id, name, university, avatar_url").in("id", partnerIds);
      const nameMap: Record<string, { name: string; university: string; avatar_url: string | null }> = {};
      (partners || []).forEach((p: { id: string; name: string; university: string; avatar_url: string | null }) => {
        nameMap[p.id] = { name: p.name, university: p.university, avatar_url: p.avatar_url };
      });
      const threadList = Object.values(threadMap).map(t => ({
        ...t,
        partnerName: nameMap[t.partnerId]?.name || "Unknown",
        partnerUni: nameMap[t.partnerId]?.university || "",
        partnerAvatar: nameMap[t.partnerId]?.avatar_url || null,
      }));
      threadList.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
      setThreads(threadList);
    } else {
      setThreads([]);
    }

    // Friends
    const { data: friendRows } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
      .eq("status", "accepted");
    if (friendRows && friendRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const friendIds = (friendRows as any[]).map(f => f.user_id === session.user.id ? f.friend_id : f.user_id);
      const { data: friendProfiles } = await supabase
        .from("profiles")
        .select("id, name, university, course, year_of_study, avatar_url")
        .in("id", friendIds);
      setFriends(friendProfiles || []);
    } else {
      setFriends([]);
    }

    // Incoming friend requests
    const { data: pending } = await supabase
      .from("friendships")
      .select("*")
      .eq("friend_id", session.user.id)
      .eq("status", "pending");
    if (pending && pending.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestorIds = (pending as any[]).map(p => p.user_id);
      const { data: requestors } = await supabase
        .from("profiles")
        .select("id, name, university, course, year_of_study, avatar_url")
        .in("id", requestorIds);
      setPendingRequests(requestors || []);
    } else {
      setPendingRequests([]);
    }

    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function searchPeople() {
    if (!searchQuery.trim()) { setSearchResults([]); return; }

    if (isDemo) {
      const q = searchQuery.toLowerCase();
      setSearchResults(demoPeople.filter(p => p.name.toLowerCase().includes(q)));
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, name, university, course, year_of_study, avatar_url")
      .ilike("name", `%${searchQuery.trim()}%`)
      .neq("id", userId)
      .limit(20);
    setSearchResults(data || []);
  }

  async function sendFriendRequest(friendId: string) {
    if (!gate("community")) return;
    if (!userId) return;

    if (isDemo) {
      alert("Friend request sent (demo mode)");
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .insert({ user_id: userId, friend_id: friendId, status: "pending" });
    if (error) { alert("Couldn't send request: " + error.message); return; }
    alert("Friend request sent!");
  }

  async function acceptFriendRequest(requestorId: string) {
    if (!userId) return;
    if (isDemo) { return; }
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", requestorId)
      .eq("friend_id", userId);
    fetchAll();
  }

  async function declineFriendRequest(requestorId: string) {
    if (!userId) return;
    if (isDemo) { return; }
    await supabase
      .from("friendships")
      .delete()
      .eq("user_id", requestorId)
      .eq("friend_id", userId);
    fetchAll();
  }

  async function startMessageWithFriend(friend: PublicProfile) {
    const thread: Thread = {
      partnerId: friend.id,
      partnerName: friend.name,
      partnerUni: friend.university,
      partnerAvatar: friend.avatar_url,
      lastMessage: "",
      lastAt: new Date().toISOString(),
      unread: false,
    };
    setActiveThread(thread);
    if (isDemo) { setMessages([]); return; }

    // Fetch any prior conversation
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${userId})`)
      .order("created_at");
    setMessages(data || []);
  }

  async function openThread(thread: Thread) {
    setActiveThread(thread);
    if (isDemo) { setMessages(demoConversation); return; }
    const { data } = await supabase.from("direct_messages").select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${thread.partnerId}),and(sender_id.eq.${thread.partnerId},receiver_id.eq.${userId})`)
      .order("created_at");
    if (data) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", [userId!, thread.partnerId]);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: { id: string; name: string }) => { nameMap[p.id] = p.name; });
      setMessages(data.map(d => ({ ...d, senderName: nameMap[d.sender_id] || "Unknown" })));
    }
    await supabase.from("direct_messages").update({ read: true }).eq("sender_id", thread.partnerId).eq("receiver_id", userId).eq("read", false);
  }

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (isDemo || !activeThread) return;
    const channel = supabase.channel(`dm-${activeThread.partnerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const dm = payload.new as DM;
        if ((dm.sender_id === userId && dm.receiver_id === activeThread.partnerId) ||
            (dm.sender_id === activeThread.partnerId && dm.receiver_id === userId)) {
          supabase.from("profiles").select("name").eq("id", dm.sender_id).single().then(({ data }) => {
            setMessages(prev => [...prev, { ...dm, senderName: data?.name || "Unknown" }]);
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDemo, activeThread, userId]);

  async function sendMessage() {
    if (!gate("community")) return;
    if (!newMsg.trim() || !activeThread) return;
    if (!userId) return;

    if (isDemo) {
      const fresh: DM = {
        id: Date.now(),
        sender_id: userId,
        receiver_id: activeThread.partnerId,
        content: newMsg.trim(),
        read: true,
        created_at: new Date().toISOString(),
        senderName: userName,
      };
      setMessages(prev => [...prev, fresh]);
      setNewMsg("");
      return;
    }

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: userId,
      receiver_id: activeThread.partnerId,
      content: newMsg.trim(),
    });
    if (error) { alert("Couldn't send: " + error.message); return; }
    setNewMsg("");
  }

  if (loading) return null;

  function initial(name: string) { return name ? name.charAt(0).toUpperCase() : "?"; }
  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  // Conversation view
  if (activeThread) {
    return (
      <AppShell>
        <div className="page active">
          <button className="back-btn" onClick={() => { setActiveThread(null); fetchAll(); }}>&larr; Back</button>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <div className="avatar">{initial(activeThread.partnerName)}</div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{activeThread.partnerName}</h1>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="chat-container" style={{ padding: "0 22px" }}>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty" style={{ margin: "40px 0" }}>Say hello to start the conversation!</div>
                ) : messages.map(m => (
                  <div key={m.id} className="chat-message" style={m.sender_id === userId ? { flexDirection: "row-reverse" } : {}}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initial(m.senderName || activeThread.partnerName)}</div>
                    <div className={`chat-bubble${m.sender_id === userId ? " own" : ""}`}>
                      {m.content}
                      <div className="chat-time">{timeAgo(m.created_at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div className="chat-input-row" style={{ padding: "14px 0" }}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }} />
                <button className="btn btn-sm" onClick={sendMessage}>Send</button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Messages</h1>
        <p className="page-sub">Find people, add friends, and message them directly.</p>

        {/* Tabs */}
        <div className="row mb" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab("messages")} style={tab === "messages" ? { background: "var(--rose-50)", borderColor: "var(--rose-200)", color: "var(--red)" } : {}}>
            Messages{threads.some(t => t.unread) ? ` •` : ""}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab("friends")} style={tab === "friends" ? { background: "var(--rose-50)", borderColor: "var(--rose-200)", color: "var(--red)" } : {}}>
            Friends ({friends.length}){pendingRequests.length > 0 ? ` • ${pendingRequests.length}` : ""}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab("find")} style={tab === "find" ? { background: "var(--rose-50)", borderColor: "var(--rose-200)", color: "var(--red)" } : {}}>
            Find people
          </button>
        </div>

        {/* Messages tab */}
        {tab === "messages" && (
          threads.length ? threads.map(t => (
            <div key={t.partnerId} className="dm-thread" onClick={() => openThread(t)}>
              <div className="avatar">{initial(t.partnerName)}</div>
              <div className="dm-thread-info">
                <div className="dm-thread-name">{t.partnerName}</div>
                <div className="dm-thread-preview">{t.lastMessage}</div>
              </div>
              <div className="dm-thread-time">{timeAgo(t.lastAt)}</div>
              {t.unread && <div className="dm-unread" />}
            </div>
          )) : <div className="empty">No messages yet. Add a friend to start chatting!</div>
        )}

        {/* Friends tab */}
        {tab === "friends" && (
          <>
            {pendingRequests.length > 0 && (
              <>
                <h3 className="section-title">Friend requests</h3>
                {pendingRequests.map(p => (
                  <div key={p.id} className="card mb">
                    <div className="row between" style={{ alignItems: "center" }}>
                      <div className="row" style={{ gap: 12, alignItems: "center" }}>
                        <div className="avatar">{initial(p.name)}</div>
                        <div>
                          <b>{p.name}</b><br />
                          <small>{p.course} · {p.year_of_study}</small>
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-grad btn-sm" onClick={() => acceptFriendRequest(p.id)}>Accept</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => declineFriendRequest(p.id)}>Decline</button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <h3 className="section-title">Your friends</h3>
            {friends.length ? friends.map(f => (
              <div key={f.id} className="card mb">
                <div className="row between" style={{ alignItems: "center" }}>
                  <div className="row" style={{ gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setProfilePreview(f)}>
                    <div className="avatar">{initial(f.name)}</div>
                    <div>
                      <b>{f.name}</b><br />
                      <small>{f.course || "Student"} · {f.year_of_study}</small>
                    </div>
                  </div>
                  <button className="btn btn-grad btn-sm" onClick={() => startMessageWithFriend(f)}>Message</button>
                </div>
              </div>
            )) : <div className="empty">No friends yet. Find people to connect with!</div>}
          </>
        )}

        {/* Find people tab */}
        {tab === "find" && (
          <>
            <div className="card mb">
              <div className="row" style={{ gap: 8 }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); searchPeople(); } }}
                  placeholder="Search by name..."
                  style={{ flex: 1 }}
                />
                <button className="btn btn-grad" onClick={searchPeople}>Search</button>
              </div>
            </div>
            {searchResults.length ? searchResults.map(p => (
              <div key={p.id} className="card mb">
                <div className="row between" style={{ alignItems: "center" }}>
                  <div className="row" style={{ gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setProfilePreview(p)}>
                    <div className="avatar">{initial(p.name)}</div>
                    <div>
                      <b>{p.name}</b><br />
                      <small>{p.course || "Student"} · {p.year_of_study}</small>
                    </div>
                  </div>
                  <button className="btn btn-grad btn-sm" onClick={() => sendFriendRequest(p.id)}>Add friend</button>
                </div>
              </div>
            )) : searchQuery ? (
              <div className="empty">No results. Try a different name.</div>
            ) : (
              <div className="empty">Search for a person by name to add them as a friend.</div>
            )}
          </>
        )}

        {/* Profile preview modal */}
        {profilePreview && (
          <div className="modal-bg open" onClick={() => setProfilePreview(null)} style={{ display: "flex" }}>
            <div className="modal" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 16px" }}>
                <div className="avatar" style={{ width: 80, height: 80, fontSize: 28, marginBottom: 12 }}>
                  {initial(profilePreview.name)}
                </div>
                <h2 style={{ margin: 0 }}>{profilePreview.name}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>
                  {profilePreview.course || "Student"} · {profilePreview.year_of_study}
                </p>
              </div>
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <button className="btn btn-grad" onClick={() => { startMessageWithFriend(profilePreview); setProfilePreview(null); }}>Message</button>
                {!friends.some(f => f.id === profilePreview.id) && (
                  <button className="btn btn-ghost" onClick={() => { sendFriendRequest(profilePreview.id); setProfilePreview(null); }}>Add friend</button>
                )}
                <button className="btn btn-ghost" onClick={() => setProfilePreview(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function MessagesPage() { return <Suspense><MessagesInner /></Suspense>; }
