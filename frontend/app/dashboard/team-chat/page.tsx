"use client";
// app/dashboard/team-chat/page.tsx — Real-time team messaging

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Send, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Message {
  id:          string;
  sender_id:   string;
  sender_name: string;
  content:     string;
  created_at:  string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function TeamChatPage() {
  const router = useRouter();

  const [profileId,   setProfileId]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [userId,      setUserId]      = useState<string | null>(null);
  const [userName,    setUserName]    = useState("");
  const [teamSize,    setTeamSize]    = useState(0);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Caregiver");

    const savedId = typeof window !== "undefined"
      ? localStorage.getItem("willow:active_profile") : null;

    const { data: allAccess } = await supabase
      .from("caregiver_access")
      .select("profile_id, profiles(id, child_name, full_name)")
      .eq("user_id", user.id);

    if (!allAccess?.length) { setLoading(false); return; }

    const access = (savedId ? allAccess.find((a: any) => a.profile_id === savedId) : allAccess[0]) ?? allAccess[0];
    const pid    = access.profile_id;
    const p      = (access as any).profiles;
    setProfileId(pid);
    setProfileName(p?.full_name || p?.child_name || "");

    // Team size
    const { count } = await supabase
      .from("caregiver_access")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", pid);
    setTeamSize(count ?? 0);

    // Load last 50 messages
    const { data: msgs } = await supabase
      .from("team_messages")
      .select("*")
      .eq("profile_id", pid)
      .order("created_at", { ascending: true })
      .limit(50);
    setMessages(msgs ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!profileId) return;
    const supabase = getSupabase();

    const channel = supabase
      .channel(`team-chat:${profileId}`)
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "team_messages",
        filter: `profile_id=eq.${profileId}`,
      }, (payload) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !profileId || !userId || sending) return;
    setSending(true);
    setInput("");

    const supabase = getSupabase();
    await supabase.from("team_messages").insert({
      profile_id:  profileId,
      sender_id:   userId,
      sender_name: userName,
      content:     text,
    });

    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size={28} label="Loading team chat…" />
    </div>
  );

  // Group consecutive messages by same sender
  const grouped = messages.reduce<{ sender_id: string; sender_name: string; msgs: Message[] }[]>((acc, msg) => {
    const last = acc[acc.length - 1];
    if (last && last.sender_id === msg.sender_id) {
      last.msgs.push(msg);
    } else {
      acc.push({ sender_id: msg.sender_id, sender_name: msg.sender_name, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 80px)", maxHeight: "800px" }}>

      {/* Header */}
      <div className="shrink-0 mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm hover:underline mb-3"
          style={{ color: "var(--color-text-muted)" }}>
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
              Team Chat
            </h1>
            <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Users size={13} aria-hidden="true" />
              {profileName}'s care team · {teamSize} member{teamSize !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Message area */}
      <div
        className="flex-1 rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ background: "var(--color-bg-subtle)" }}
          aria-label="Team chat messages"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <span className="text-4xl mb-3" aria-hidden="true">💬</span>
              <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                Team chat for {profileName}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Messages here are only visible to {profileName}'s care team.
              </p>
            </div>
          )}

          {grouped.map((group, gi) => {
            const isMe = group.sender_id === userId;
            return (
              <div key={gi} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    background: isMe ? "var(--color-accent)" : "var(--color-border)",
                    color:      isMe ? "var(--color-accent-text)" : "var(--color-text-muted)",
                  }}
                  aria-hidden="true"
                >
                  {(group.sender_name || "?")[0].toUpperCase()}
                </div>

                <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  {/* Sender name (first bubble only) */}
                  {!isMe && (
                    <span className="text-xs font-semibold px-1"
                      style={{ color: "var(--color-text-subtle)" }}>
                      {group.sender_name}
                    </span>
                  )}

                  {/* Message bubbles */}
                  {group.msgs.map((msg, mi) => (
                    <div key={msg.id}>
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={{
                          background:           isMe ? "var(--color-accent)" : "var(--color-surface)",
                          color:                isMe ? "var(--color-accent-text)" : "var(--color-text)",
                          border:               isMe ? "none" : "1px solid var(--color-border)",
                          borderBottomRightRadius: isMe && mi === group.msgs.length - 1 ? "6px" : undefined,
                          borderBottomLeftRadius:  !isMe && mi === group.msgs.length - 1 ? "6px" : undefined,
                        }}
                      >
                        {msg.content}
                      </div>
                      {/* Timestamp on last bubble */}
                      {mi === group.msgs.length - 1 && (
                        <time
                          dateTime={msg.created_at}
                          className="text-xs px-1 mt-0.5 block"
                          style={{ color: "var(--color-text-subtle)", textAlign: isMe ? "right" : "left" }}
                        >
                          {formatTime(msg.created_at)}
                        </time>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} aria-hidden="true" />
        </div>

        {/* Input */}
        <div
          className="shrink-0 flex items-end gap-3 p-3 border-t"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${profileName}'s care team…`}
            rows={1}
            disabled={sending}
            aria-label="Team message"
            className="input flex-1 resize-none"
            style={{ minHeight: "44px", maxHeight: "120px", overflowY: "auto", lineHeight: "1.5" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="btn-primary px-3 shrink-0"
            style={{ height: "44px", minWidth: "44px" }}
            aria-label="Send message"
          >
            {sending
              ? <LoadingSpinner size={16} label="Sending…" />
              : <Send size={16} aria-hidden="true" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
