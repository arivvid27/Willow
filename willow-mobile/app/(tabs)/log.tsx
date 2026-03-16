// app/(tabs)/log.tsx — New daily log screen

import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";

type DayRating = "good" | "neutral" | "bad";

const DAY_RATINGS: { value: DayRating; emoji: string; label: string }[] = [
  { value: "good",    emoji: "😊", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "bad",     emoji: "😔", label: "Difficult" },
];

const MOOD_LABELS: Record<number, string> = {
  1:"Very difficult",2:"Difficult",3:"Challenging",4:"Below average",5:"Average",
  6:"Above average",7:"Good",8:"Great",9:"Excellent",10:"Outstanding",
};

// Simple tag pill component
function TagPill({ label, onRemove, accent }: { label: string; onRemove: () => void; accent: string }) {
  return (
    <TouchableOpacity
      style={[tp.pill, { backgroundColor: `${accent}22`, borderColor: `${accent}66` }]}
      onPress={onRemove}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
    >
      <Text style={[tp.text, { color: accent }]}>{label}</Text>
      <Ionicons name="close" size={13} color={accent} />
    </TouchableOpacity>
  );
}
const tp = StyleSheet.create({
  pill: { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:10, paddingVertical:6, borderRadius:99, borderWidth:1 },
  text: { fontSize:13, fontWeight:"500" },
});

// Tag input row
function TagInput({
  tags, onAdd, onRemove, placeholder, tokens,
}: {
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  tokens: any;
}) {
  const [value, setValue] = useState("");

  function add() {
    const t = value.trim();
    if (t && !tags.includes(t)) onAdd(t);
    setValue("");
  }

  return (
    <View>
      {tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {tags.map((t) => (
            <TagPill key={t} label={t} onRemove={() => onRemove(t)} accent={tokens.accent} />
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[{ flex: 1, borderWidth: 1.5, borderRadius: 8, padding: 11, fontSize: 15, color: tokens.text, backgroundColor: tokens.bgSubtle, borderColor: tokens.border }]}
          placeholder={placeholder}
          placeholderTextColor={tokens.textSubtle}
          value={value}
          onChangeText={setValue}
          onSubmitEditing={add}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={add}
          style={[{ width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.accentLight, borderWidth: 1, borderColor: tokens.borderStrong }]}
          accessibilityRole="button"
          accessibilityLabel="Add item"
        >
          <Ionicons name="add" size={20} color={tokens.accent} />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 11, color: tokens.textSubtle, marginTop: 4 }}>Tap + or press Enter to add · Tap a tag to remove it</Text>
    </View>
  );
}

// Section header
function SectionHeader({ icon, title, subtitle, tokens }: { icon: string; title: string; subtitle?: string; tokens: any }) {
  return (
    <View style={[sh.row, { borderBottomColor: tokens.border }]}>
      <View style={[sh.icon, { backgroundColor: tokens.accentLight }]}>
        <Ionicons name={icon as any} size={15} color={tokens.accent} />
      </View>
      <View>
        <Text style={[sh.title, { color: tokens.text }]}>{title}</Text>
        {subtitle && <Text style={[sh.sub, { color: tokens.textSubtle }]}>{subtitle}</Text>}
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection:"row", alignItems:"center", gap:10, paddingBottom:12, marginBottom:16, borderBottomWidth:1 },
  icon:  { width:32, height:32, borderRadius:8, alignItems:"center", justifyContent:"center" },
  title: { fontSize:14, fontWeight:"600" },
  sub:   { fontSize:12, marginTop:1 },
});

// Hours row
function HoursRow({ label, icon, value, onChange, tokens }: { label: string; icon: string; value: string; onChange: (v: string) => void; tokens: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
      <Ionicons name={icon as any} size={16} color={tokens.accent} style={{ width: 22 }} />
      <Text style={{ flex: 1, fontSize: 14, color: tokens.textMuted, marginLeft: 8 }}>{label}</Text>
      <TextInput
        style={[{ width: 72, borderWidth: 1.5, borderRadius: 8, padding: 8, fontSize: 16, textAlign: "center", color: tokens.text, backgroundColor: tokens.bgSubtle, borderColor: tokens.border }]}
        placeholder="—"
        placeholderTextColor={tokens.textSubtle}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        accessibilityLabel={`${label} hours`}
      />
      <Text style={{ fontSize: 13, color: tokens.textSubtle, marginLeft: 6, width: 24 }}>hrs</Text>
    </View>
  );
}

export default function NewLogScreen() {
  const { tokens }  = useTheme();
  const router      = useRouter();

  const [profileId,    setProfileId]    = useState<string | null>(null);
  const [caregiverId,  setCaregiverId]  = useState<string | null>(null);
  const [profileName,  setProfileName]  = useState("");
  const [dayRating,    setDayRating]    = useState<DayRating | null>(null);
  const [mood,         setMood]         = useState(5);
  const [sleep,        setSleep]        = useState("");
  const [hoursSchool,  setHoursSchool]  = useState("");
  const [hoursOutdoor, setHoursOutdoor] = useState("");
  const [hoursAba,     setHoursAba]     = useState("");
  const [hoursHome,    setHoursHome]    = useState("");
  const [hoursScreen,  setHoursScreen]  = useState("");
  const [outdoorActs,  setOutdoorActs]  = useState<string[]>([]);
  const [medications,  setMedications]  = useState<string[]>([]);
  const [foodBreakfast,setFoodBreakfast]= useState<string[]>([]);
  const [foodLunch,    setFoodLunch]    = useState<string[]>([]);
  const [foodDinner,   setFoodDinner]   = useState<string[]>([]);
  const [foodSnacks,   setFoodSnacks]   = useState<string[]>([]);
  const [notes,        setNotes]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [initLoading,  setInitLoading]  = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCaregiverId(user.id);
      const { data: access } = await supabase
        .from("caregiver_access")
        .select("profile_id, profiles(child_name)")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (access) {
        setProfileId(access.profile_id);
        setProfileName((access as any).profiles?.child_name ?? "");
      }
      setInitLoading(false);
    }
    init();
  }, []);

  function parseH(v: string) { const n = parseFloat(v); return isNaN(n) ? null : Math.min(Math.max(n, 0), 24); }
  function addTag(list: string[], setter: (l: string[]) => void, val: string) {
    if (val && !list.includes(val)) setter([...list, val]);
  }
  function removeTag(list: string[], setter: (l: string[]) => void, val: string) {
    setter(list.filter((t) => t !== val));
  }

  async function handleSubmit() {
    if (!profileId || !caregiverId) return;
    setLoading(true);
    const { error } = await supabase.from("logs").insert({
      profile_id: profileId, caregiver_id: caregiverId,
      day_rating: dayRating, mood,
      sleep: sleep ? parseFloat(sleep) : null,
      medications, notes: notes.trim() || null,
      hours_school: parseH(hoursSchool), hours_outdoor: parseH(hoursOutdoor),
      hours_aba: parseH(hoursAba), hours_home: parseH(hoursHome), hours_screen: parseH(hoursScreen),
      outdoor_activities: outdoorActs,
      food_breakfast: foodBreakfast, food_lunch: foodLunch,
      food_dinner: foodDinner, food_snacks: foodSnacks,
    });
    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Alert.alert("Saved! 🌿", "Log entry saved successfully.", [
      { text: "OK", onPress: () => router.push("/(tabs)/") },
    ]);
  }

  const s = ls2(tokens);
  const outdoorHrs = parseH(hoursOutdoor) ?? 0;

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
        <View>
          <Text style={[s.headerTitle, { color: tokens.text }]}>New daily log</Text>
          <Text style={[s.headerSub, { color: tokens.textSubtle }]}>Logging for {profileName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Section 1: Overall Day ── */}
          <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <SectionHeader icon="happy-outline" title="How was the day overall?" tokens={tokens} />

            {/* Face buttons */}
            <View style={s.ratingRow}>
              {DAY_RATINGS.map(({ value, emoji, label }) => {
                const sel = dayRating === value;
                const borderColor = value === "good" ? "#22c55e" : value === "neutral" ? "#eab308" : "#ef4444";
                const bgColor = value === "good" ? "rgba(34,197,94,0.15)" : value === "neutral" ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)";
                return (
                  <TouchableOpacity
                    key={value}
                    style={[s.ratingBtn, { backgroundColor: sel ? bgColor : tokens.bgSubtle, borderColor: sel ? borderColor : tokens.border, transform: [{ scale: sel ? 1.04 : 1 }] }]}
                    onPress={() => setDayRating(sel ? null : value)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    accessibilityLabel={label}
                  >
                    <Text style={{ fontSize: 36 }}>{emoji}</Text>
                    <Text style={[s.ratingLabel, { color: sel ? borderColor : tokens.textMuted }]}>{label.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Mood bar */}
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={[s.fieldLabel, { color: tokens.text }]}>Mood score</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.accent }}>{mood}/10 — {MOOD_LABELS[mood]}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[s.moodBar, {
                      backgroundColor: n <= mood
                        ? mood <= 3 ? "#ef4444" : mood <= 6 ? "#f59e0b" : tokens.accent
                        : tokens.border,
                      transform: [{ scaleY: mood === n ? 1.3 : 1 }],
                    }]}
                    onPress={() => setMood(n)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Mood ${n}`}
                  />
                ))}
              </View>
            </View>

            {/* Sleep */}
            <View style={{ marginTop: 20 }}>
              <Text style={[s.fieldLabel, { color: tokens.text }]}>
                <Ionicons name="moon-outline" size={14} color={tokens.accent} /> Sleep last night
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                <TextInput
                  style={[s.input, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text, width: 90 }]}
                  placeholder="e.g. 8"
                  placeholderTextColor={tokens.textSubtle}
                  value={sleep}
                  onChangeText={setSleep}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Sleep hours"
                />
                <Text style={{ color: tokens.textMuted, fontSize: 14 }}>hours</Text>
              </View>
            </View>
          </View>

          {/* ── Section 2: Time ── */}
          <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <SectionHeader icon="time-outline" title="Time breakdown" subtitle="Hours in each setting today" tokens={tokens} />
            <View style={[{ borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: tokens.border }]}>
              <HoursRow label="At school"   icon="school-outline"    value={hoursSchool}  onChange={setHoursSchool}  tokens={tokens} />
              <HoursRow label="Outdoors"    icon="leaf-outline"      value={hoursOutdoor} onChange={setHoursOutdoor} tokens={tokens} />
              <HoursRow label="ABA therapy" icon="pulse-outline"     value={hoursAba}     onChange={setHoursAba}     tokens={tokens} />
              <HoursRow label="At home"     icon="home-outline"      value={hoursHome}    onChange={setHoursHome}    tokens={tokens} />
              <View style={{ borderBottomWidth: 0 }}>
                <HoursRow label="Screen time" icon="tv-outline"      value={hoursScreen}  onChange={setHoursScreen}  tokens={tokens} />
              </View>
            </View>
            {outdoorHrs > 0 && (
              <View style={[s.subSection, { backgroundColor: tokens.accentLight, borderColor: tokens.borderStrong }]}>
                <Text style={[s.fieldLabel, { color: tokens.text, marginBottom: 8 }]}>What did he do outside?</Text>
                <TagInput tags={outdoorActs} onAdd={(v) => addTag(outdoorActs, setOutdoorActs, v)} onRemove={(v) => removeTag(outdoorActs, setOutdoorActs, v)} placeholder="Playground, Bike ride…" tokens={tokens} />
              </View>
            )}
          </View>

          {/* ── Section 3: Medications ── */}
          <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <SectionHeader icon="medical-outline" title="Medications taken today" tokens={tokens} />
            <TagInput tags={medications} onAdd={(v) => addTag(medications, setMedications, v)} onRemove={(v) => removeTag(medications, setMedications, v)} placeholder="Type medication name…" tokens={tokens} />
          </View>

          {/* ── Section 4: Food ── */}
          <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <SectionHeader icon="restaurant-outline" title="Food & nutrition" subtitle="What did he eat today?" tokens={tokens} />
            {[
              { label: "🌅 Breakfast", tags: foodBreakfast, setter: setFoodBreakfast, ph: "Oatmeal, Eggs, Toast…",     bg: "rgba(234,179,8,0.1)",    border: "rgba(234,179,8,0.35)" },
              { label: "☀️ Lunch",    tags: foodLunch,     setter: setFoodLunch,     ph: "Sandwich, Rice, Chicken…", bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.35)" },
              { label: "🌙 Dinner",   tags: foodDinner,    setter: setFoodDinner,    ph: "Pasta, Soup, Grilled…",    bg: "rgba(139,92,246,0.1)",   border: "rgba(139,92,246,0.35)" },
              { label: "🍎 Snacks",   tags: foodSnacks,    setter: setFoodSnacks,    ph: "Crackers, Fruit Cup…",     bg: "rgba(236,72,153,0.1)",   border: "rgba(236,72,153,0.35)" },
            ].map(({ label, tags, setter, ph, bg, border }) => (
              <View key={label} style={[s.mealBox, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[s.fieldLabel, { color: tokens.text, marginBottom: 8 }]}>{label}</Text>
                <TagInput tags={tags} onAdd={(v) => addTag(tags, setter, v)} onRemove={(v) => removeTag(tags, setter, v)} placeholder={ph} tokens={tokens} />
              </View>
            ))}
          </View>

          {/* ── Section 5: Notes ── */}
          <View style={[s.section, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <SectionHeader icon="document-text-outline" title="Behavior & event notes" subtitle="Optional" tokens={tokens} />
            <TextInput
              style={[s.textArea, { backgroundColor: tokens.bgSubtle, borderColor: tokens.border, color: tokens.text }]}
              placeholder="Any notable behaviors, triggers, wins, or concerns today…"
              placeholderTextColor={tokens.textSubtle}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
              accessibilityLabel="Behavior notes"
            />
            <Text style={{ fontSize: 11, color: tokens.textSubtle, textAlign: "right", marginTop: 4 }}>{notes.length}/2000</Text>
          </View>

          {/* ── Submit ── */}
          <View style={s.submitRow}>
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: tokens.accent, opacity: loading ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Save log entry"
            >
              {loading ? <ActivityIndicator color={tokens.accentText} /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={tokens.accentText} />
                  <Text style={[s.submitText, { color: tokens.accentText }]}>Save log entry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ls2 = (t: any) => StyleSheet.create({
  safe:         { flex: 1 },
  header:       { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle:  { fontSize: 20, fontWeight: "700" },
  headerSub:    { fontSize: 13, marginTop: 2 },
  scroll:       { padding: 16, paddingBottom: 48 },
  section:      { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  fieldLabel:   { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  input:        { borderWidth: 1.5, borderRadius: 8, padding: 11, fontSize: 16, minHeight: 44 },
  textArea:     { borderWidth: 1.5, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 100 },
  ratingRow:    { flexDirection: "row", gap: 10 },
  ratingBtn:    { flex: 1, alignItems: "center", paddingVertical: 18, borderRadius: 14, borderWidth: 2, gap: 6 },
  ratingLabel:  { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  moodBar:      { flex: 1, height: 28, borderRadius: 4 },
  subSection:   { marginTop: 14, padding: 14, borderRadius: 12, borderWidth: 1 },
  mealBox:      { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  submitRow:    { paddingTop: 8 },
  submitBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 12 },
  submitText:   { fontSize: 16, fontWeight: "600" },
});
