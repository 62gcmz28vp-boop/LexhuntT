/**
 * Deterministic fallbacks used when ANTHROPIC_API_KEY is not configured. They only recombine facts already in
 * the profile and the job record — no invention — and are labelled "Template" in the UI.
 */
import type { Firm, JobRow, Profile } from "./types";
import type { ApplySmarterOutput, ApproachOutput } from "./ai";
import { scoreJob } from "./matching";
import { PRACTICE_AREAS } from "./taxonomy";
import { PREP_PACKS } from "@/data/prepPacks";

const name = (p: Profile) => p.fullName ?? "[Your full name]";
const ag = (p: Profile) => p.experience.find((e) => /addleshaw/i.test(e.organisation));

export function templateApplySmarter(job: JobRow, profile: Profile, firm?: Firm | null): ApplySmarterOutput {
  const m = job.match_detail ?? scoreJob(job, profile);
  const exp = ag(profile);
  const areas = (job.practice_areas ?? []).map((a) => PRACTICE_AREAS[a]?.label ?? a);
  const bullets = exp?.bullets ?? [];
  const relevant = bullets.filter((b) => (job.practice_areas ?? []).some((a) => PRACTICE_AREAS[a]?.keywords.some((k) => b.toLowerCase().includes(k)))).slice(0, 4);
  const lead = relevant.length ? relevant : bullets.slice(0, 3);
  const packKeys = new Set<string>();
  for (const a of job.practice_areas ?? []) {
    if (a === "corporate_ma") packKeys.add("ma").add("corporate");
    if (a === "projects_construction") packKeys.add("projects").add("construction");
    if (a === "disputes") packKeys.add("disputes");
    if (a === "regulatory_compliance") packKeys.add("compliance").add("regulatory");
  }
  if (!packKeys.size) packKeys.add("corporate");
  const packs = PREP_PACKS.filter((p) => packKeys.has(p.key));

  const coverLetter = `Dear [Recruitment team / named contact],

I am writing to apply for the ${job.title} position at ${job.employer} in ${job.location ?? "Riyadh"}. I am a law graduate based in Riyadh and recently completed a co-op traineeship at Addleshaw Goddard, where I supported corporate and commercial matters in an international law firm environment.

During the placement I:
${lead.map((b) => `• ${b}`).join("\n")}

${areas.length ? `This experience is directly relevant to the ${areas.join(" and ")} work described in the role. ` : ""}I am comfortable drafting and reviewing documents in both Arabic and English and I am used to producing careful, well-organised work to transaction and project deadlines.

${firm?.practiceAreas?.length ? `I am particularly drawn to ${job.employer}'s work in ${firm.practiceAreas.slice(0, 3).join(", ")}. ` : ""}[Add one sentence on why this employer specifically — a matter, team or value you can cite from a public source.]

I would welcome the opportunity to discuss how I could contribute. My CV is attached.

Yours sincerely,
${name(profile)}
[Phone] · [Email]`;

  return {
    roleAnalysis: `${job.title} at ${job.employer}. Practice focus detected: ${areas.join(", ") || "not specified"}. Experience asked: ${job.experience_min ?? "not stated"}${job.experience_max != null ? `–${job.experience_max}` : ""} years. Licence: ${job.license_req.replace(/_/g, " ")}. ${job.nationality_req ? `Nationality: ${job.nationality_req}. ` : ""}${job.eligibility_note ?? ""}`,
    requirements: m.criteria.map((c) => ({ requirement: c.label, evidence: c.reason, status: c.score >= c.weight * 0.8 ? "met" : c.score >= c.weight * 0.4 ? "partial" : c.score === 0 ? "gap" : "unknown" })),
    cvImprovements: [
      "Put the Addleshaw Goddard placement first, with a one-line summary: 'Co-op Trainee, Addleshaw Goddard (international law firm) — corporate, M&A, projects and disputes support.'",
      `Re-order the bullets so the most relevant to this role come first: ${lead.map((b) => `"${b.split(" ").slice(0, 6).join(" ")}…"`).join("; ")}.`,
      "Add your exact dates, university, degree and graduation year (currently unknown in your profile) — recruiters screen on these first.",
      "Add a 'Languages' line stating Arabic and English with your honest level, plus 'bilingual legal drafting'.",
      "If you hold or are pursuing MoJ trainee registration, state it explicitly.",
    ],
    emphasise: m.strengths.length ? m.strengths : lead,
    coverLetter,
    recruitmentEmail: {
      subject: `Application — ${job.title} — ${name(profile)}`,
      body: `Dear [Name / Recruitment team],

Please find attached my CV and cover letter for the ${job.title} role${job.location ? ` in ${job.location}` : ""}. I recently completed a co-op traineeship at Addleshaw Goddard supporting ${areas.slice(0, 2).join(" and ") || "corporate and commercial"} matters, and I would be grateful for your consideration.

Kind regards,
${name(profile)}
[Phone]`,
    },
    firmBrief: firm
      ? `${firm.name} — ${firm.classification.replace("_", " ")}. Riyadh: ${firm.riyadhOffice.text} Practice areas: ${firm.practiceAreas.join(", ") || "not listed"}. Graduate recruitment: ${firm.graduateRecruitment.map((g) => `${g.text} (${g.status})`).join(" ") || "Not publicly disclosed."} ${firm.hiringNote}`
      : "No firm research on file for this employer. Check the employer's careers page and recent news before applying.",
    interviewQuestions: [
      { question: "Why this firm / organisation, and why this team?", whyTheyAsk: "Motivation and research.", modelAnswer: `[Cite one public fact about ${job.employer}.] My co-op at Addleshaw Goddard gave me hands-on exposure to ${areas[0] ?? "corporate"} work, and I want to build on it in a team doing exactly that in Riyadh.` },
      { question: "Tell us about a due diligence task you worked on.", whyTheyAsk: "Tests method and accuracy.", modelAnswer: "On an acquisition at Addleshaw Goddard I contributed to the legal due diligence report: reviewing documents in the data room, summarising key terms and flagging issues for the supervising associate. [Add the type of documents and one issue type you flagged — no client names.]" },
      { question: "How would you prepare a chronology for a dispute?", whyTheyAsk: "Disputes fundamentals.", modelAnswer: "I prepared background chronologies and dispute notes during my co-op: I collect the documents, order events by date with source references, and highlight contractual notices and deadlines so the team can test the facts against the contract." },
      { question: "What do you know about FIDIC?", whyTheyAsk: "Construction & projects literacy.", modelAnswer: "I reviewed and researched FIDIC construction contracts during my placement. [Summarise in your own words the clause areas you looked at — e.g. claims and notices, variations, or payment.]" },
      { question: "How do you check that a Saudi regulation you are relying on is current?", whyTheyAsk: "Research rigour.", modelAnswer: "I go to the official source (the MoJ/BOE laws portal or the regulator), check for amendments and implementing regulations, and note the date I checked — the approach I used when researching Saudi laws and implementing regulations at Addleshaw Goddard." },
      ...packs.flatMap((p) => p.questions.slice(0, 1).map((q) => ({ question: q, whyTheyAsk: `${p.label} technical question.`, modelAnswer: `Prepare from: ${p.saudiLawToRevise[0]}. Link to your experience: ${p.yourEvidence[0]}.` }))),
    ],
    checklist: [
      "Confirm eligibility (nationality, licence / MoJ trainee registration, graduate vs student) against the advert",
      "Tailored CV (PDF) with university, degree, dates filled in",
      "Tailored cover letter (PDF) — replace every [placeholder]",
      "Degree certificate / transcript if requested",
      "Apply via the official link, not only the aggregator",
      "Log the application in Career Pipeline and set a follow-up date (7–10 working days)",
    ],
    integrityNotes: ["Template output (AI not configured). Every bracketed item must be completed with true information before sending."],
  };
}

export function templateApproach(firm: Firm, profile: Profile): ApproachOutput {
  const signal = firm.signals[0]?.text;
  return {
    subject: `Trainee associate opportunities — Riyadh — ${name(profile)}`,
    body: `Dear [Graduate Recruitment / named partner],

I am a law graduate based in Riyadh and recently completed a co-op traineeship at Addleshaw Goddard, where I supported due diligence, M&A documentation, FIDIC contract reviews, dispute chronologies and regulatory matrices for infrastructure and energy projects.

${signal ? `I noted ${firm.name}'s recent development — ${signal.replace(/\.$/, "")} — ` : `I am interested in ${firm.name}'s Riyadh practice`}${firm.practiceAreas.length ? ` and its work in ${firm.practiceAreas.slice(0, 2).join(" and ")}` : ""}. I would be grateful to know whether you anticipate any trainee associate or junior opportunities, and I would welcome being considered for future intakes.

I have attached my CV. Thank you for your time.

Kind regards,
${name(profile)}
[Phone] · [Email]`,
    angle: "A Riyadh-based graduate with genuine international-firm co-op experience across corporate, projects and disputes.",
    followUp: `Dear [Name], I wanted to follow up on my email of [date] regarding trainee associate opportunities at ${firm.name} in Riyadh. I remain very interested and would be happy to provide any further information. Kind regards, ${name(profile)}`,
  };
}
