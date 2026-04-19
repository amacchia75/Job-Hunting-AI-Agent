export interface CV {
  fullName: string;
  role: string;
  skills: string[];
  experience: Experience[];
  location: string;
  suggestedKeywords: string[];
}

export interface Experience {
  title: string;
  company: string;
  period: string;
  description: string;
}

export interface Job {
  job_id: string;
  title: string;
  company_name: string;
  location: string;
  via: string;
  description: string;
  thumbnail?: string;
  detected_extensions: {
    posted_at?: string;
    schedule_type?: string;
  };
  job_highlights?: {
    items: string[];
    title: string;
  }[];
  related_links?: {
    link: string;
    text: string;
  }[];
  apply_options?: {
    title: string;
    link: string;
    is_direct?: boolean;
  }[];
}

export interface JobMatchResult {
  job: Job;
  score: number;
  reasoning: string;
  matchingSkills: string[];
  missingSkills: string[];
}
