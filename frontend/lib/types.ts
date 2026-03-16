// lib/types.ts — Shared TypeScript types for Willow

export interface Profile {
  id: string;
  child_name: string;
  date_of_birth?: string;
  diagnosis_notes?: string;
  created_by?: string;
  created_at: string;
}

export interface Log {
  id: string;
  profile_id: string;
  caregiver_id: string;
  mood: number;       // 1–10
  sleep: number;      // hours
  medications: string[];
  notes?: string;
  created_at: string;
}

export interface CaregiverAccess {
  id: string;
  profile_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
}

export interface LogFormValues {
  mood: number;
  sleep: number;
  medications: string;  // comma-separated string in form, split before save
  notes: string;
}

export interface AnalyzeRequest {
  profile_name: string;
  logs: {
    mood: number;
    sleep: number;
    medications: string[];
    notes?: string;
    created_at?: string;
  }[];
}

export interface AnalyzeResponse {
  summary: string;
  pattern_analysis: string;
  suggested_adjustments: string;
  raw_markdown: string;
}
