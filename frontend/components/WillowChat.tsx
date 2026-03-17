"use client";
// components/WillowChat.tsx — theme-aware AI chat panel

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { sendChatMessage } from "@/lib/api";
import type { Log } from "@/lib/types";
import { Send, Sparkles, User, RefreshCw, ChevronDown, Leaf } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface WillowChatProps {
  profileName:     string;
  logs:            Log[];
  profileContext?: string;
}

const SUGGESTED_QUESTIONS = [
  "What patterns do you see in the recent logs?",
  "How has sleep been affecting mood this week?",
  "Are there any medication concerns I should know about?",
  "What strategies might help on low mood days?",
  "What's been going well lately?",
  "How can I better support during difficult behaviors?",
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex gap-3 animate-fade-up ${isUser ? "flex-row-reverse" : "flex-row"}`}
      role="listitem"
      aria-label={`${isUser ? "You" : "Willow"} said`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: isUser ? "var(--color-border)" : "var(--color-accent)" }}
        aria-hidden="true"
      >
        {isUser
          ? <User size={15} style={{ color: "var(--color-text-muted)" }} />
          : <Leaf size={14} style={{ color: "var(--color-accent-text)" }} />
        }
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={{
          background: isUser ? "var(--color-accent)" : "var(--color-surface)",
          color:      isUser ? "var(--color-accent-text)" : "var(--color-text)",
          border:     isUser ? "none" : `1px solid var(--color-border)`,
          boxShadow:  "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {isUser
          ? <p>{message.content}</p>
          : <div className="prose-chat"><ReactMarkdown>{message.content}</ReactMarkdown></div>
        }
        <time
          dateTime={message.timestamp.toISOString()}
          className="block text-xs mt-1.5 opacity-50"
        >
          {message.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </time>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-up" aria-label="Willow is typing" role="status">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--color-accent)" }}
        aria-hidden="true"
      >
        <Leaf size={14} style={{ color: "var(--color-accent-text)" }} />
      </div>
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex gap-1 items-center h-5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--color-text-subtle)",
                animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WillowChat({ profileName, logs, profileContext }: WillowChatProps) {
  const makeWelcome = (): Message => ({
    id: "welcome",
    role: "assistant",
    content: `Hi! I'm Willow 🌿 I'm here to help you understand **${profileName}'s** care logs and answer any questions you have.\n\nI have access to the last **${logs.length} log${logs.length !== 1 ? "s" : ""}** — ask me anything about patterns, behaviors, medications, or how to better support ${profileName}.`,
    timestamp: new Date(),
  });

  const [messages,       setMessages]       = useState<Message[]>([makeWelcome()]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [showSuggestions,setShowSuggestions]= useState(true);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setShowSuggestions(false);
    setInput("");

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { reply } = await sendChatMessage({
        profile_name: profileName,
        message: trimmed,
        history,
        logs: logs.map((l) => ({
          mood: l.mood, sleep: l.sleep, medications: l.medications ?? [],
          notes: l.notes ?? undefined, created_at: l.created_at,
        })),
      });
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", content: reply, timestamp: new Date(),
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get a response. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, messages, profileName, logs]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function clearChat() {
    setMessages([makeWelcome()]);
    setShowSuggestions(true);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <section
      aria-label="Willow AI Chat"
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        height:    "calc(100dvh - 160px)",
        minHeight: "500px",
        maxHeight: "800px",
        border:    "1px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}
            aria-hidden="true"
          >
            <Sparkles size={16} style={{ color: "var(--color-accent-text)" }} />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              Chat with Willow
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {logs.length} log{logs.length !== 1 ? "s" : ""} loaded as context
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="btn-ghost text-xs px-2.5 py-1.5"
          aria-label="Clear conversation"
        >
          <RefreshCw size={13} aria-hidden="true" /> Clear
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
        style={{ background: "var(--color-bg-subtle)" }}
        role="list"
        aria-label="Conversation"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {loading && <TypingIndicator />}

        {error && (
          <div
            role="alert"
            className="text-xs rounded-lg p-3 flex items-center gap-2"
            style={{
              background: "rgba(239,68,68,0.1)",
              color:      "var(--color-danger)",
              border:     "1px solid rgba(239,68,68,0.3)",
            }}
          >
            ⚠️ {error}
            <button onClick={() => setError(null)} className="ml-auto underline" aria-label="Dismiss error">
              Dismiss
            </button>
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Suggested questions */}
      {showSuggestions && (
        <div
          className="px-4 py-3 shrink-0"
          style={{
            background:  "var(--color-surface)",
            borderTop:   "1px solid var(--color-border)",
          }}
        >
          <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5"
            style={{ color: "var(--color-text-subtle)" }}>
            <ChevronDown size={11} aria-hidden="true" />
            Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: "var(--color-accent-light)",
                  color:      "var(--color-accent)",
                  border:     "1px solid var(--color-border-strong)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="px-4 py-3 flex gap-2 items-end shrink-0"
        style={{
          background: "var(--color-surface)",
          borderTop:  `1px solid var(--color-border)`,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${profileName}'s care…`}
          rows={1}
          disabled={loading}
          aria-label="Type your message"
          aria-describedby="chat-hint"
          className="input flex-1 resize-none"
          style={{ minHeight: "42px", maxHeight: "120px", overflowY: "auto", lineHeight: "1.5" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="btn-primary px-3 py-2.5 shrink-0"
          aria-label="Send message"
          aria-busy={loading}
          style={{ minWidth: "42px" }}
        >
          {loading ? <LoadingSpinner size={16} label="Sending…" /> : <Send size={16} aria-hidden="true" />}
        </button>
      </div>

      <p id="chat-hint" className="sr-only">Press Enter to send, Shift+Enter for a new line.</p>
    </section>
  );
}
