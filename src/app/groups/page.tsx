"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Group { id: number; name: string; description: string; is_private: boolean; created_by: string; member_count?: number; }
interface Member { id: number; user_id: string; role: string; profiles?: { name: string }; }
interface Message { id: number; content: string; created_at: string; user_id: string; profiles?: { name: string }; }

const demoGroups: Group[] = [
  { id: 1, name: "PH1011 Study Group", description: "Philosophy exam prep — meet Tuesdays at 4pm in the postgrad common room", is_private: false, created_by: "demo2", member_count: 8 },
  { id: 2, name: "IR Essay Writers", description: "Sharing tips and sources for the IR2001 essay", is_private: false, created_by: "demo1", member_count: 5 },
  { id: 3, name: "Dissertation Support", description: "For final-year students working on dissertations", is_private: true, created_by: "demo3", member_count: 12 },
];

const demoMessages: Message[] = [
  { id: 1, content: "Hey everyone! Shall we meet at 4pm as usual?", created_at: new Date(Date.now() - 7200000).toISOString(), user_id: "demo2", profiles: { name: "James Chen" } },
  { id: 2, content: "Works for me! I'll bring my Plato notes.", created_at: new Date(Date.now() - 3600000).toISOString(), user_id: "demo1", profiles: { name: "Sarah Mitchell" } },
  { id: 3, content: "Can someone explain the Allegory of the Cave again? I'm still confused about how it links to the Theory of Forms.", created_at: new Date(Date.now() - 1800000).toISOString(), user_id: "demo3", profiles: { name: "Olivia Brown" } },
];

function GroupsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [gPrivate, setGPrivate] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const fetchGroups = useCallback(async () => {
    if (isDemo) { setGroups(demoGroups); setUserId("demo-self"); setUserName("Demo Student"); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
    if (profile) setUserName(profile.name);
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    if (data) setGroups(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function openGroup(group: Group) {
    setActiveGroup(group);
    if (isDemo) {
      setMembers([
        { id: 1, user_id: "demo1", role: "member", profiles: { name: "Sarah Mitchell" } },
        { id: 2, user_id: "demo2", role: "owner", profiles: { name: "James Chen" } },
        { id: 3, user_id: "demo-self", role: "member", profiles: { name: "Demo Student" } },
      ]);
      setMessages(demoMessages);
      setIsMember(true);
      return;
    }
    // Fetch members
    const { data: mems } = await supabase.from("group_members").select("id, user_id, role, profiles(name)").eq("group_id", group.id);
    if (mems) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = (mems as any[]).map(m => ({ ...m, profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles }));
      setMembers(mapped);
      setIsMember(mapped.some((m: Member) => m.user_id === userId));
    }
    // Fetch messages
    const { data: msgs } = await supabase.from("group_messages").select("id, content, created_at, user_id, profiles(name)").eq("group_id", group.id).order("created_at").limit(100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (msgs) setMessages((msgs as any[]).map(m => ({ ...m, profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles })));
  }

  // Auto-scroll chat to bottom
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime for group messages
  useEffect(() => {
    if (isDemo || !activeGroup) return;
    const channel = supabase.channel(`group-${activeGroup.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${activeGroup.id}` }, (payload) => {
        const msg = payload.new as Message;
        // Fetch the sender name
        supabase.from("profiles").select("name").eq("id", msg.user_id).single().then(({ data }) => {
          setMessages(prev => [...prev, { ...msg, profiles: data || { name: "Unknown" } }]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDemo, activeGroup]);

  async function sendMessage() {
    if (!gate("groups")) return;
    if (!newMsg.trim() || !activeGroup) return;
    if (!userId) return;
    await supabase.from("group_messages").insert({ group_id: activeGroup.id, user_id: userId, content: newMsg.trim() });
    setNewMsg("");
  }

  async function joinGroup() {
    if (!gate("groups")) return;
    if (!activeGroup) return;
    if (!userId) return;
    await supabase.from("group_members").insert({ group_id: activeGroup.id, user_id: userId, role: "member" });
    setIsMember(true);
    openGroup(activeGroup);
  }

  async function leaveGroup() {
    if (!activeGroup || !confirm("Leave this group?")) return;
    if (isDemo) { setIsMember(false); return; }
    if (!userId) return;
    await supabase.from("group_members").delete().eq("group_id", activeGroup.id).eq("user_id", userId);
    setIsMember(false);
    setActiveGroup(null);
    fetchGroups();
  }

  async function createGroup() {
    if (!gate("groups")) return;
    if (!gName.trim()) return;
    const { data } = await supabase.from("groups").insert({ name: gName.trim(), description: gDesc.trim(), is_private: gPrivate, created_by: userId }).select().single();
    if (data) {
      await supabase.from("group_members").insert({ group_id: data.id, user_id: userId, role: "owner" });
    }
    setGName(""); setGDesc(""); setGPrivate(false); setShowCreate(false);
    fetchGroups();
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

  // Group detail view with chat
  if (activeGroup) {
    return (
      <AppShell>
        <div className="page active">
          <button className="back-btn" onClick={() => setActiveGroup(null)}>← All groups</button>
          <div className="row between" style={{ marginBottom: 16 }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>{activeGroup.name}</h1>
              <p className="page-sub" style={{ marginBottom: 0 }}>{activeGroup.description}</p>
              <small>{members.length} member{members.length !== 1 ? "s" : ""} · {activeGroup.is_private ? "Private" : "Public"}</small>
            </div>
            <div className="row">
              {!isMember ? (
                <button className="btn btn-grad" onClick={joinGroup}>Join group</button>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={leaveGroup}>Leave</button>
              )}
            </div>
          </div>

          {isMember ? (
            <div className="card" style={{ padding: 0 }}>
              <div className="chat-container" style={{ padding: "0 22px" }}>
                <div className="chat-messages">
                  {messages.length ? messages.map(m => (
                    <div key={m.id} className="chat-message">
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initial(m.profiles?.name || "")}</div>
                      <div className={`chat-bubble${m.user_id === userId ? " own" : ""}`}>
                        <div className="chat-sender">{m.profiles?.name || "Unknown"}</div>
                        {m.content}
                        <div className="chat-time">{timeAgo(m.created_at)}</div>
                      </div>
                    </div>
                  )) : <div className="empty" style={{ margin: "40px 0" }}>No messages yet. Say hello!</div>}
                  <div ref={msgEndRef} />
                </div>
                <div className="chat-input-row" style={{ padding: "14px 0" }}>
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }} />
                  <button className="btn btn-sm" onClick={sendMessage}>Send</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Join this group to see messages and chat.</div>
          )}
        </div>
      </AppShell>
    );
  }

  // Group list view
  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Groups</h1>
        <p className="page-sub">Study groups at your university.</p>

        <div className="row mb">
          <button className="btn btn-grad" onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create group"}</button>
        </div>

        {showCreate && (
          <div className="card mb">
            <h3>Create a new group</h3>
            <div className="field"><label>Group name</label><input value={gName} onChange={e => setGName(e.target.value)} placeholder="e.g. PH1011 Study Group" /></div>
            <div className="field"><label>Description</label><textarea value={gDesc} onChange={e => setGDesc(e.target.value)} placeholder="What is this group about?" maxLength={500} /></div>
            <div className="check-row" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={gPrivate} onChange={e => setGPrivate(e.target.checked)} style={{ accentColor: "var(--red)" }} />
              <span style={{ fontSize: 13 }}>Private group (only visible to members)</span>
            </div>
            <button className="btn" onClick={createGroup}>Create</button>
          </div>
        )}

        {groups.length ? groups.map(g => (
          <div key={g.id} className="group-card" onClick={() => openGroup(g)}>
            <div className="row between">
              <h3>{g.name}</h3>
              <div className="row" style={{ gap: 8 }}>
                {g.is_private && <span className="badge badge-gray">Private</span>}
                <span className="badge badge-green">{g.member_count || 0} members</span>
              </div>
            </div>
            {g.description && <div className="group-desc">{g.description}</div>}
          </div>
        )) : <div className="empty">No groups yet. Create one to get started!</div>}
      </div>
    </AppShell>
  );
}

export default function GroupsPage() { return <Suspense><GroupsInner /></Suspense>; }
