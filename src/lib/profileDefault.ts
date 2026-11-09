import type { Profile } from "./types";

/**
 * Initial profile — ONLY what the user stated in their brief. Unknown fields stay null/unknown
 * (university, graduation year, grades, licence status, nationality). Upload a CV to fill them in.
 */
export const DEFAULT_PROFILE: Profile = {
  fullName: null,
  headline: "Law graduate · Former co-op trainee, Addleshaw Goddard",
  location: "Riyadh, Saudi Arabia",
  saudiNational: null,
  licenseStatus: "unknown",
  graduate: true,
  education: [{ institution: null, degree: "Law degree (details not yet provided)", year: null, grade: null, provenance: "self_reported" }],
  experience: [
    {
      organisation: "Addleshaw Goddard",
      role: "Co-op Trainee",
      location: null,
      start: null,
      end: null,
      provenance: "self_reported",
      bullets: [
        "Prepared and contributed to legal due diligence reports in corporate and commercial transactions.",
        "Worked on mergers and acquisitions, share purchase agreements and shareholders' resolutions.",
        "Reviewed and researched FIDIC construction contracts.",
        "Prepared dispute-related legal notes, background chronologies and contractual analyses.",
        "Conducted legal research on Saudi laws and implementing regulations.",
        "Prepared regulatory and stakeholder matrices for infrastructure, energy and public-private partnership projects.",
        "Supported corporate governance, company incorporation, restructuring and corporate documentation.",
        "Drafted and reviewed bilingual Arabic-English legal documents.",
        "Supported corporate and commercial legal matters in an international law firm environment.",
      ],
    },
  ],
  skills: [
    "Legal due diligence",
    "M&A transaction support",
    "Share purchase agreements",
    "Shareholders' resolutions",
    "FIDIC contract review",
    "Dispute chronologies & legal notes",
    "Contractual analysis",
    "Saudi legal & regulatory research",
    "Regulatory & stakeholder matrices",
    "Corporate governance",
    "Company incorporation & restructuring",
    "Bilingual Arabic-English drafting",
  ],
  practiceStrengths: ["corporate_ma", "projects_construction", "regulatory_compliance", "disputes", "contracts"],
  languages: [
    { language: "Arabic", level: null },
    { language: "English", level: null },
  ],
  certifications: [],
  cvDocumentId: null,
  cvUpdatedAt: null,
  notes: "",
};
