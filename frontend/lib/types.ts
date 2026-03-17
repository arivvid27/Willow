// lib/types.ts — Shared TypeScript types for Willow

export interface Profile {
  id:                 string;
  child_name:         string;
  full_name?:         string;
  date_of_birth?:     string;
  diagnosis_notes?:   string;
  diagnoses?:         string[];
  allergies?:         string[];
  emergency_contact?: string;
  emergency_phone?:   string;
  therapist_name?:    string;
  school_name?:       string;
  additional_notes?:  string;
  created_by?:        string;
  created_at:         string;
  updated_at?:        string;
}

export interface Log {
  id:              string;
  profile_id:      string;
  caregiver_id:    string;
  mood:            number | null;
  sleep:           number | null;
  medications?:    string[];
  notes?:          string;
  // Extended fields
  day_rating?:     "good" | "neutral" | "bad" | null;
  hours_school?:   number | null;
  hours_outdoor?:  number | null;
  hours_aba?:      number | null;
  hours_home?:     number | null;
  hours_screen?:   number | null;
  outdoor_activities?: string[];
  food_breakfast?: string[];
  food_lunch?:     string[];
  food_dinner?:    string[];
  food_snacks?:    string[];
  // Draft support
  status:          "draft" | "published";
  last_edited_by?: string | null;
  updated_at?:     string;
  created_at:      string;
}

export interface CaregiverAccess {
  id:         string;
  profile_id: string;
  user_id:    string;
  role:       "owner" | "editor" | "viewer";
  created_at: string;
}

export interface AnalyzeRequest {
  profile_name:     string;
  profile_context?: string;
  logs: {
    mood:        number | null;
    sleep:       number | null;
    medications: string[];
    notes?:      string;
    created_at?: string;
  }[];
}

export interface AnalyzeResponse {
  summary:               string;
  pattern_analysis:      string;
  suggested_adjustments: string;
  raw_markdown:          string;
}