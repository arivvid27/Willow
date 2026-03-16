// lib/types.ts — Shared types mirroring the web app

export interface Profile {
  id:              string;
  child_name:      string;
  date_of_birth?:  string;
  diagnosis_notes?:string;
  created_by?:     string;
  created_at:      string;
}

export interface Log {
  id:           string;
  profile_id:   string;
  caregiver_id: string;
  day_rating?:  "good" | "neutral" | "bad" | null;
  mood:         number;
  sleep?:       number | null;
  medications?: string[];
  notes?:       string | null;
  hours_school?:  number | null;
  hours_outdoor?: number | null;
  hours_aba?:     number | null;
  hours_home?:    number | null;
  hours_screen?:  number | null;
  outdoor_activities?: string[];
  food_breakfast?: string[];
  food_lunch?:     string[];
  food_dinner?:    string[];
  food_snacks?:    string[];
  created_at: string;
}
