export type Verification = "verified" | "historical" | "reported" | "not_disclosed";
/**
 * verified      – stated on the firm's own official page (as indexed on the research date)
 * historical    – was true at a past date (closed intake, expired listing, dated page)
 * reported      – stated by a third party (legal press, directory, job aggregator), not the firm itself
 * not_disclosed – no public source found
 */

export interface Source {
  label: string;
  url: string;
  kind: "official" | "press" | "directory" | "aggregator" | "social";
  accessed: string; // ISO date the research was performed
}

export interface Claim {
  text: string;
  status: Verification;
  sources?: number[]; // indexes into firm.sources
}

export type FirmClass = "international" | "saudi" | "international_affiliate" | "boutique";

export interface RecruitmentStage {
  stage: string;
  detail: string;
  status: Verification;
  sources?: number[];
}

export interface Firm {
  slug: string;
  name: string;
  nameAr?: string;
  website?: string;
  classification: FirmClass;
  riyadhOffice: Claim; // address / presence
  presenceSince?: string;
  structure?: string; // e.g. licensed foreign firm, JV, association
  practiceAreas: string[];
  size?: Claim;
  careersUrl?: string;
  applicationRoute?: Claim; // portal / email
  hiringStatus: "confirmed_vacancy" | "programme_listed" | "intake_closed" | "no_public_vacancy" | "unknown";
  hiringNote: string;
  graduateRecruitment: Claim[]; // previous trainees, programmes, eligibility, deadlines
  recruitmentProcess: RecruitmentStage[];
  acceptsSpeculative: Verification | "unknown";
  signals: { kind: "expansion" | "new_practice" | "historical_trainees" | "graduate_page" | "direct_applications" | "lateral_hiring"; text: string; date?: string; sources?: number[] }[];
  tips?: string[];
  sources: Source[];
  lastResearched: string;
}

export type JobStatus = "open" | "closed" | "unverified";
export type LicenseReq = "licensed_required" | "trainee_registration" | "not_required" | "unknown";
export type JobCategory = "law_firm_international" | "law_firm_saudi" | "in_house" | "government" | "consulting" | "financial" | "other";
export type JobKind = "trainee" | "graduate_programme" | "co_op" | "junior" | "paralegal" | "compliance" | "contracts" | "research" | "other";

export interface JobInput {
  title: string;
  employer: string;
  employerSlug?: string;
  category: JobCategory;
  kind: JobKind;
  location?: string;
  workMode?: "onsite" | "hybrid" | "remote" | "unknown";
  experienceMin?: number | null;
  experienceMax?: number | null;
  salary?: string | null;
  postedAt?: string | null;
  deadline?: string | null;
  status: JobStatus;
  licenseReq: LicenseReq;
  nationalityReq?: string | null;
  eligibilityNote?: string | null;
  description?: string;
  applyUrl?: string;
  practiceAreas?: string[];
  verificationNote?: string;
  source: { source: string; url: string; externalId?: string; publisher?: string };
  origin?: "research" | "discovery" | "manual" | "career_page";
}

export interface JobRow {
  id: string;
  dedupe_key: string;
  title: string;
  employer: string;
  employer_slug: string | null;
  category: JobCategory;
  job_kind: JobKind;
  location: string | null;
  work_mode: string;
  experience_min: number | null;
  experience_max: number | null;
  salary: string | null;
  posted_at: Date | null;
  deadline: Date | null;
  status: JobStatus;
  license_req: LicenseReq;
  nationality_req: string | null;
  eligibility_note: string | null;
  description: string | null;
  apply_url: string | null;
  practice_areas: string[];
  first_seen: Date;
  last_seen: Date;
  last_verified: Date | null;
  verification_note: string | null;
  origin: string;
  is_new: boolean;
  saved: boolean;
  dismissed: boolean;
  match_score: number | null;
  match_detail: MatchResult | null;
}

export interface ProfileExperience {
  organisation: string;
  role: string;
  location?: string | null;
  start?: string | null;
  end?: string | null;
  bullets: string[];
  provenance: "self_reported" | "cv_extracted" | "edited";
}

export interface Profile {
  fullName: string | null;
  headline: string;
  location: string;
  saudiNational: boolean | null;
  licenseStatus: "unknown" | "none" | "trainee_registered" | "licensed";
  graduate: boolean;
  education: { institution: string | null; degree: string | null; year: string | null; grade: string | null; provenance: ProfileExperience["provenance"] }[];
  experience: ProfileExperience[];
  skills: string[];
  practiceStrengths: string[]; // taxonomy keys
  languages: { language: string; level: string | null }[];
  certifications: string[];
  cvDocumentId: number | null;
  cvUpdatedAt: string | null;
  notes: string;
}

export interface CriterionScore {
  key: string;
  label: string;
  weight: number;
  score: number;
  reason: string;
}

export interface MatchResult {
  total: number;
  criteria: CriterionScore[];
  strengths: string[];
  gaps: string[];
  positioning: string[];
  strategy: string;
  flags: string[];
  computedAt: string;
}
