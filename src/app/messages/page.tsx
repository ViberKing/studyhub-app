"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Thread {
  partnerId: string;
  partnerName: string;
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

const demoThreads: Thread[] = [
  { partnerId: "demo1", partnerName: "Sarah Mitchell", lastMessage: "Thanks for the Plato notes! Really helpful.", lastAt: new Date(Date.now() - 1800000).toISOString(), unread: true },
  { partnerId: "demo2", partnerName: "James Chen", lastMessage: "See you at the study group on Tuesday!", lastAt: new Date(Date.now() - 86400000).toISOString(), unread: false },
];

const demoConversation: DM[] = [
  { id: 1, sender_id: "demo1", receiver_id: "demo-self", content: "Hey! Did you get the reading list for week 5?", read: true, created_at: new Date(Date.now() - 7200000).toISOString(), senderName: "Sarah Mitchell" },
  { id: 2, sender_id: "demo-self", receiver_id: "demo1", content: "Yeah, I'll share my notes with you. The Plato section is really dense.", read: true, created_at: new Date(Date.now() - 5400000).toISOString(), senderName: "Demo Student" },
  { id: 3, sender_id: "demo1", receiver_id: "demo-self", content: "Thanks for the Plato notes! Really helpful.", read: false, created_at: new Date(Date.now() - 1800000).toISOString(), senderName: "Sarah Mitchell" },
];

function MessagesInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    if (isDemo) { setThreads(demoThreads); setUserId("demo-self"); setUserName("Demo Student"); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
    if (profile) setUserName(profile.name);

    // Fetch all DMs involving this user
    const { data: dms } = await supabase.from("direct_messages").select("*").or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).order("created_at", { ascending: false });
    if (!dms || dms.length === 0) { setThreads([]); setLoading(false); return; }

    // Group by conversation partner
    const threadMap: Record<string, { partnerId: string; lastMessage: string; lastAt: string; unread: boolean }> = {};
    for (const dm of dms) {
      const partnerId = dm.sender_id === session.user.id ? dm.receiver_id : dm.sender_id;
      if (!threadMap[partnerId]) {
        threadMap[partnerId] = { partnerId, lastMessage: dm.content, lastAt: dm.created_at, unread: dm.receiver_id === session.user.id && !dm.read };
      }
    }

    // Fetch partner names
    const partnerIds = Object.keys(threadMap);
    const { data: partners } = await supabase.from("profiles").select("id, name").in("id", partnerIds);
    const nameMap: Record<string, string> = {};
    (partners || []).forEach((p: { id: string; name: string }) => { nameMap[p.id] = p.name; });

    const threadList = Object.values(threadMap).map(t => ({ ...t, partnerName: nameMap[t.partnerId] || "Unknown" }));
    threadList.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    setThreads(threadList);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  async function openThread(thread: Thread) {
    setActiveThread(thread);
    if (isDemo) { setMessages(demoConversation); return; }
    // Fetch conversation with this partner
    const { data } = await supabase.from("direct_messages").select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${thread.partnerId}),and(sender_id.eq.${thread.partnerId},receiver_id.eq.${userId})`)
      .order("created_at");
    if (data) {
      // Get names
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", [userId!, thread.partnerId]);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: { id: string; name: string }) => { nameMap[p.id] = p.name; });
      setMessages(data.map(d => ({ ...d, senderName: nameMap[d.sender_id] || "Unknown" })));
    }
    // Mark as read
    await supabase.from("direct_messages").update({ read: true }).eq("sender_id", thread.partnerId).eq("receiver_id", userId).eq("read", false);
  }

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime for DMs
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
    await supabase.from("direct_messages").insert({ sender_id: userId, receiver_id: activeThread.partnerId, content: newMsg.trim() });
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
          <button className="back-btn" onClick={() => { setActiveThread(null); fetchThreads(); }}>← All messages</button>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <div className="avatar">{initial(activeThread.partnerName)}</div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{activeThread.partnerName}</h1>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="chat-container" style={{ padding: "0 22px" }}>
              <div className="chat-messages">
                {messages.map(m => (
                  <div key={m.id} className="chat-message" style={m.sender_id === userId ? { flexDirection: "row-reverse" } : {}}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initial(m.senderName || "")}</div>
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

  // Thread list
  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Messages</h1>
        <p className="page-sub">Direct messages with your study group members.</p>
        <div className="integrity-banner" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18 }}>💬</div>
          <div><b>DMs are available between users who share a study group.</b> Join a group first, then you can message other members directly.</div>
        </div>
        {threads.length ? threads.map(t => (
          <div key={t.partnerId} className="dm-thread" onClick={() => openThread(t)}>
            <div className="avatar">{initial(t.partnerName)}</div>
            <div className="dm-thread-info">
              <div className="dm-thread-name">{t.partnerName}</div>
              <div className="dm-thread-preview">{t.lastMessage}</div>
            </div>
            <div className="dm-thread-time">{timeAgo(t.lastAt)}</div>
            {t.unread && <div className="dm-unread" />}
          </div>
        )) : <div className="empty">No messages yet. Join a group and start a conversation!</div>}
      </div>
    </AppShell>
  );
}

export default function MessagesPage() { return <Suspense><MessagesInner /></Suspense>; }
