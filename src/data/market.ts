/** Attributable market findings for LEGAL RECRUITMENT MARKET INTELLIGENCE. Each finding cites its source. */
export interface MarketFinding {
  topic: "licensing" | "trainee_route" | "requirements" | "salary" | "programmes" | "expansion";
  title: string;
  detail: string;
  sources: { label: string; url: string }[];
  date: string;
}

export const MARKET_FINDINGS: MarketFinding[] = [
  {
    topic: "licensing",
    title: "Foreign firms can now license directly in KSA (2023 reform)",
    detail:
      "Amendments to the Code of Law Practice in early 2023 allowed foreign firms to apply directly to the Ministry of Justice for a licence; previously they practised through Saudi associations. First licences: Clifford Chance, Herbert Smith Freehills, Latham & Watkins (March 2023). Reported conditions include ≥50% Saudi-national lawyers and five-year licence renewal.",
    sources: [
      { label: "Law Gazette", url: "https://www.lawgazette.co.uk/practice/saudi-arabia-grants-first-foreign-licences-to-three-law-firms/5115330.article" },
      { label: "Canadian Lawyer", url: "https://www.canadianlawyermag.com/news/international/saudi-arabia-grants-first-foreign-licences-to-clifford-chance-latham-watkins-and-hsf/374191" },
    ],
    date: "2023-03",
  },
  {
    topic: "expansion",
    title: "Steady wave of new Riyadh offices through 2025–2026",
    detail:
      "Openings or licences reported for Addleshaw Goddard (Dec 2023), Gibson Dunn (Nov 2023), Pinsent Masons (Mar 2025), Freshfields (2025), Akin (2025), King & Spalding combination (2025), Reed Smith (Oct 2025), Trowers & Hamlins (Nov 2025), Morgan Lewis (Nov 2025), Linklaters (2026, JV with Bakhaidar) and Bird & Bird (licensing in progress). New offices with a 50% Saudi-lawyer requirement create demand for Saudi junior lawyers and trainees.",
    sources: [
      { label: "Reed Smith", url: "https://www.reedsmith.com/news/reed-smith-expands-in-the-middle-east-with-saudi-arabia-office-launch/" },
      { label: "Morgan Lewis", url: "https://www.morganlewis.com/news/2025/11/morgan-lewis-deepens-middle-east-presence-with-riyadh-office-launch" },
      { label: "Trowers", url: "https://www.trowers.com/news/trowers-secures-licence-and-opens-new-office-in-saudi-arabia" },
      { label: "Global Legal Post (Linklaters)", url: "https://www.globallegalpost.com/news/linklaters-hires-partner-from-saudi-firm-for-riyadh-office-launch-2131516818" },
    ],
    date: "2026",
  },
  {
    topic: "trainee_route",
    title: "Co-op (التدريب التعاوني) is the dominant entry route at international firms",
    detail:
      "Gibson Dunn, White & Case, A&O Shearman, Clifford Chance, Pinsent Masons and Clyde & Co all publish Riyadh co-op / internship schemes for current Saudi law students, and several state that co-op performance is the basis for trainee-associate offers. Graduates who already completed a co-op elsewhere (as you did at Addleshaw Goddard) should apply to direct trainee intakes and lead with that experience.",
    sources: [
      { label: "Gibson Dunn", url: "https://www.gibsondunn.com/careers/law-students/" },
      { label: "White & Case", url: "https://www.whitecase.com/careers/locations/saudi-arabia/saudi-law-trainee-program" },
      { label: "A&O Shearman Co-op", url: "https://careers.aoshearman.com/en/saudi-arabia-coop-program" },
      { label: "Pinsent Masons Co-op", url: "https://www.pinsentmasons.com/careers/early-talent/saudi-arabia/co-op-training-programme" },
    ],
    date: "2026",
  },
  {
    topic: "requirements",
    title: "Saudi-law trainee roles typically require Saudi nationality + MoJ trainee registration",
    detail:
      "The MoJ training programme lists Saudi nationality, a Sharia or law bachelor's from a Saudi college (or accepted equivalent), good conduct, and a supervising lawyer with a valid licence and ≥5 years' practice. Training duration is stated as three years for bachelor's holders and one year for master's holders (MoJ page, possibly dated). Freshfields' Riyadh Legal Trainee listing mirrors these requirements.",
    sources: [
      { label: "MoJ — Lawyers training programme", url: "https://www.moj.gov.sa/English/Ministry/Departments/Mohammah/Pages/LawyersTraining.aspx" },
      { label: "Code of Law Practice (MoJ laws portal)", url: "https://laws.moj.gov.sa/en/legislation/PP5rr6HnHC8skiEH5baGkg" },
    ],
    date: "2026",
  },
  {
    topic: "requirements",
    title: "Licensed lawyers must join the Saudi Bar Association within 90 days",
    detail: "Under the amended Code of Law Practice (Royal Decree M/66), a newly licensed lawyer must obtain basic Saudi Bar Association membership within 90 days. Licences are valid five years.",
    sources: [{ label: "Amendments to the Code of Law Practice (PDF)", url: "https://www.moj.gov.sa/Documents/Regulations/pdf/En/Amendments%20to%20the%20Code%20of%20Law%20Practice.pdf" }],
    date: "2022",
  },
  {
    topic: "programmes",
    title: "English-law route: White & Case GCC English Law Trainee Program",
    detail: "Two-year English-law training contract that can start in Riyadh; candidates must complete the SQE first. Relevant only if you plan to qualify in England & Wales.",
    sources: [{ label: "White & Case", url: "https://www.whitecase.com/careers/locations/saudi-arabia/gcc-english-law" }],
    date: "2026",
  },
  {
    topic: "salary",
    title: "No reliable public salary data for Riyadh trainee lawyers",
    detail:
      "No employer-published or survey-grade salary data for Riyadh trainee lawyers was found. Aggregator listings rarely disclose pay, and Arabic job-board ads typically state 'salary determined after interview'. London trainee figures (e.g. Legal Cheek's 2026 table: £70k at Kirkland/Latham) are not comparable to Riyadh pay and are shown for context only.",
    sources: [{ label: "Legal Cheek (London trainee pay, 2026)", url: "https://www.legalcheek.com/2026/10/70k-straight-out-of-law-school-heres-what-the-top-law-firms-are-paying-new-trainees/" }],
    date: "2026-10",
  },
];
