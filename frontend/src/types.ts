export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface AiAnalysis {
  strengths: string[];
  gaps: string[];
  keywords: string[];
}

export interface TailorRewrite {
  context: string;
  suggested: string;
  why: string;
}

export interface AiTailor {
  tailored_summary: string;
  rewrites: TailorRewrite[];
  keywords_to_add: string[];
}

export interface Application {
  id: number;
  company: string;
  role: string;
  location?: string;
  job_url?: string;
  job_description?: string;
  status: ApplicationStatus;
  notes?: string;
  follow_up_at?: string | null;
  applied_at: string;
  ai_match_score?: number | null;
  ai_analysis?: AiAnalysis | null;
  ai_tailor?: AiTailor | null;
}

export interface ApplicationForm {
  company: string;
  role: string;
  location: string;
  job_url: string;
  job_description: string;
  status: ApplicationStatus;
  notes: string;
  follow_up_at: string;
}

export interface ApplicationSummary {
  total: number;
  response_rate: number;
  avg_match_score: number | null;
  counts: Record<ApplicationStatus, number>;
}

export interface Resume {
  id: number;
  name: string;
  resume_text: string;
  s3_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: number;
  prefix: string;
  created_at: string;
}

export interface ApiError extends Error {
  duplicate?: Application;
}
