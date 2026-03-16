// app/(tabs)/chat.tsx — AI Chat screen

import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { supabase } from "@/lib/supabase";
import { chatWithAI } from "@/lib/api";
import { useTheme } from "@/lib/ThemeContext";
import type { Log } from "@/lib/types";

interface Message {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
}

const SUGGESTED = [
  "What patterns do you see in recent logs?",
  "How has sleep been affecting mood?",
  "Are there any medication concerns?",
  "What strategies help on low mood days?",
  "What's been going well lately?",
];

export default function ChatScreen() {
  const { tokens } = useTheme();

  const [profileName,    setProfileName]    = useState("");
  const [logs,           setLogs]           = useState<Log[]>([]);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [sending,        setSending]        = useState(false);
  const [initLoading,    setInitLoading]    = useState(true);
  const [showSuggestions,setShowSuggestions]= useState(true);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: access } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(child_name)")
        .eq("user_id", user.id).limit(1).single();
      if (!access) { setInitLoading(false); return; }

      const pName = (access as any).profiles?.child_name ?? "Unknown";
      const pId   = access.profile_id;
      setProfileName(pName);

      const { data: logsData } = await supabase
        .from("logs").select("*")
        .eq("profile_id", pId)
        .order("created_at", { ascending: false })
        .limit(14);
      setLogs(logsData ?? []);

      // Welcome message
      setMessages([{
        id:        "welcome",
        role:      "assistant",
        content:   `Hi! I'm Willow 🌿 I'm here to help you understand **${pName}'s** care logs.\n\nI have the last **${(logsData ?? []).length} logs** as context — ask me anything about patterns, behaviors, or how to better support ${pName}.`,
        timestamp: new Date(),
      }]);
      setInitLoading(false);
    }
    init();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setShowSuggestions(false);
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { reply } = await chatWithAI({
        profile_name: profileName,
        message:      trimmed,
        history,
        logs: logs.map((l) => ({
          mood: l.mood, sleep: l.sleep, medications: l.medications ?? [],
          notes: l.notes ?? undefined, created_at: l.created_at,
        })),
      });
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant", content: reply, timestamp: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Sorry, I couldn't connect to the server. Is the backend running?",
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [sending, messages, profileName, logs]);

  const s = styles(tokens);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[s.messageRow, isUser && s.messageRowUser]}>
        {!isUser && (
          <View style={[s.avatar, { backgroundColor: tokens.accent }]}>
            <Ionicons name="leaf" size={14} color={tokens.accentText} />
          </View>
        )}
        <View
          style={[
            s.bubble,
            isUser
              ? [s.bubbleUser, { backgroundColor: tokens.accent }]
              : [s.bubbleAssistant, { backgroundColor: tokens.surface, borderColor: tokens.border }],
          ]}
        >
          {isUser ? (
            <Text style={{ color: tokens.accentText, fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
          ) : (
            <Markdown style={{
              body:    { color: tokens.text,   fontSize: 15, lineHeight: 22 },
              strong:  { fontWeight: "700" },
              heading2:{ color: tokens.accent, fontSize: 15, fontWeight: "700" },
              bullet_list: { paddingLeft: 4 },
            }}>
              {item.content}
            </Markdown>
          )}
          <Text style={[s.timestamp, { color: isUser ? "rgba(255,255,255,0.6)" : tokens.textSubtle }]}>
            {item.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>
        {isUser && (
          <View style={[s.avatar, { backgroundColor: tokens.border }]}>
            <Ionicons name="person" size={14} color={tokens.textMuted} />
          </View>
        )}
      </View>
    );
  };

  if (initLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tokens.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[s.headerIcon, { backgroundColor: tokens.accent }]}>
            <Ionicons name="sparkles" size={16} color={tokens.accentText} />
          </View>
          <View>
            <Text style={[s.headerTitle, { color: tokens.text }]}>Chat with Willow</Text>
            <Text style={[s.headerSub, { color: tokens.textSubtle }]}>
              {logs.length} log{logs.length !== 1 ? "s" : ""} loaded as context
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            setMessages([{
              id: "welcome", role: "assistant",
              content: `Hi again! Ask me anything about ${profileName}'s care.`,
              timestamp: new Date(),
            }]);
            setShowSuggestions(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Clear chat"
        >
          <Ionicons name="refresh-outline" size={20} color={tokens.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[s.messageList, { backgroundColor: tokens.bgSubtle }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            sending ? (
              <View style={[s.messageRow]}>
                <View style={[s.avatar, { backgroundColor: tokens.accent }]}>
                  <Ionicons name="leaf" size={14} color={tokens.accentText} />
                </View>
                <View style={[s.bubble, s.bubbleAssistant, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                  <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[s.typingDot, { backgroundColor: tokens.textSubtle }]} />
                    ))}
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggestions */}
        {showSuggestions && (
          <View style={[s.suggestionsBar, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
            <FlatList
              horizontal
              data={SUGGESTED}
              keyExtractor={(q) => q}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.suggestionChip, { backgroundColor: tokens.accentLight, borderColor: tokens.borderStrong }]}
                  onPress={() => sendMessage(item)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, color: tokens.accent, fontWeight: "500" }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input bar */}
        <View style={[s.inputBar, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          <TextInput
            style={[s.textInput, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
            placeholder={`Ask about ${profileName}'s care…`}
            placeholderTextColor={tokens.textSubtle}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit={false}
            accessibilityLabel="Type your message"
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: tokens.accent, opacity: (!input.trim() || sending) ? 0.5 : 1 }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={18} color={tokens.accentText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (t: any) => StyleSheet.create({
  safe:            { flex: 1 },
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontSize: 16, fontWeight: "700" },
  headerSub:       { fontSize: 12, marginTop: 1 },
  messageList:     { padding: 14, paddingBottom: 8, flexGrow: 1 },
  messageRow:      { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 14 },
  messageRowUser:  { flexDirection: "row-reverse" },
  avatar:          { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble:          { maxWidth: "78%", borderRadius: 18, padding: 12 },
  bubbleUser:      { borderBottomRightRadius: 4 },
  bubbleAssistant: { borderBottomLeftRadius: 4, borderWidth: 1 },
  timestamp:       { fontSize: 10, marginTop: 4, textAlign: "right" },
  typingDot:       { width: 7, height: 7, borderRadius: 4 },
  suggestionsBar:  { borderTopWidth: 1 },
  suggestionChip:  { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  inputBar:        { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1 },
  textInput:       { flex: 1, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
