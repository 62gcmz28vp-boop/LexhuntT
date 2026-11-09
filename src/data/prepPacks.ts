/**
 * Practice-specific preparation packs (Application Studio). These are study guides, not facts about any firm.
 * Laws are named so you can read the primary text on the MoJ / BOE laws portals before interviews.
 */
export interface PrepPack {
  key: string;
  label: string;
  labelAr: string;
  whatTheyTest: string[];
  saudiLawToRevise: string[];
  yourEvidence: string[]; // map to AG experience
  questions: string[];
}

export const PREP_PACKS: PrepPack[] = [
  {
    key: "corporate",
    label: "Corporate & Governance",
    labelAr: "الشركات والحوكمة",
    whatTheyTest: ["Accuracy with corporate documents", "Understanding of company forms and approvals", "Organisation of signing / closing workstreams"],
    saudiLawToRevise: ["Companies Law (2022, in force 2023) — company forms, shareholder & board approvals", "Corporate governance regulations (CMA, for listed companies)", "Commercial Register Law & MISA foreign investment licensing"],
    yourEvidence: ["Supported company incorporation, restructuring and corporate documentation", "Drafted / reviewed shareholders' resolutions", "Corporate governance support"],
    questions: [
      "Walk me through the documents needed to incorporate an LLC in Saudi Arabia with a foreign shareholder.",
      "What is the difference between a shareholders' resolution and a board resolution, and when is each needed?",
      "How would you organise a corporate restructuring document checklist?",
    ],
  },
  {
    key: "ma",
    label: "M&A",
    labelAr: "الاندماج والاستحواذ",
    whatTheyTest: ["Due diligence method and red-flag judgement", "SPA structure (conditions, warranties, indemnities)", "Attention to detail under deadline"],
    saudiLawToRevise: ["Companies Law — share transfers, pre-emption", "GAC (General Authority for Competition) merger control thresholds", "CMA Merger & Acquisition Regulations (listed targets)"],
    yourEvidence: ["Prepared and contributed to legal due diligence reports", "Worked on M&A transactions and share purchase agreements", "Shareholders' resolutions"],
    questions: [
      "How do you structure a legal due diligence report, and what makes a finding a 'red flag'?",
      "Explain warranties versus indemnities in an SPA.",
      "A data-room document is in Arabic and the report is in English — how do you handle translation risk?",
    ],
  },
  {
    key: "projects",
    label: "Projects, Energy & PPP",
    labelAr: "المشاريع والطاقة والشراكة",
    whatTheyTest: ["Understanding of project structures and stakeholders", "Regulatory mapping", "Commercial awareness of Vision 2030 projects"],
    saudiLawToRevise: ["Private Sector Participation (PPP) Law (2021) and its Implementing Regulations", "Government Tenders and Procurement Law (2019)", "Electricity / energy sector regulation (ECRA)"],
    yourEvidence: ["Prepared regulatory and stakeholder matrices for infrastructure, energy and PPP projects", "Legal research on Saudi laws and implementing regulations"],
    questions: [
      "What would a regulatory matrix for a Saudi PPP project contain, and who uses it?",
      "Name the key stakeholders in a typical Saudi utility PPP and their roles.",
      "Why might a project company need approvals from multiple regulators?",
    ],
  },
  {
    key: "construction",
    label: "Construction (FIDIC)",
    labelAr: "الإنشاءات (فيديك)",
    whatTheyTest: ["FIDIC familiarity (Red / Yellow / Silver Books)", "Notice and claims mechanics", "Ability to read a contract against facts"],
    saudiLawToRevise: ["Civil Transactions Law (2023) — contract interpretation, damages", "Government Tenders and Procurement Law (public works)", "Interaction of FIDIC terms with Saudi mandatory law"],
    yourEvidence: ["Reviewed and researched FIDIC construction contracts", "Prepared contractual analyses"],
    questions: [
      "Explain the significance of the time-bar in FIDIC Sub-Clause 20 claims.",
      "How do the Red Book and Yellow Book allocate design risk?",
      "How would Saudi mandatory law affect a liquidated damages clause?",
    ],
  },
  {
    key: "disputes",
    label: "Disputes & Arbitration",
    labelAr: "النزاعات والتحكيم",
    whatTheyTest: ["Fact organisation (chronologies)", "Legal research and analysis", "Clear written notes"],
    saudiLawToRevise: ["Arbitration Law (2012)", "Commercial Courts Law (2020)", "Law of Evidence (2022)", "SCCA Arbitration Rules"],
    yourEvidence: ["Prepared dispute-related legal notes and background chronologies", "Contractual analyses for disputes"],
    questions: [
      "How do you build a chronology from a large set of documents, and what do you flag?",
      "What are the requirements for a valid arbitration agreement under Saudi law?",
      "How are foreign arbitral awards enforced in the Kingdom?",
    ],
  },
  {
    key: "compliance",
    label: "Compliance & Risk",
    labelAr: "الامتثال والمخاطر",
    whatTheyTest: ["Structured thinking about obligations and controls", "Research accuracy", "Practical, business-facing communication"],
    saudiLawToRevise: ["Anti-Money Laundering Law (2017) and Implementing Regulations", "Personal Data Protection Law (in force 2023)", "SAMA / CMA rulebooks relevant to the employer"],
    yourEvidence: ["Regulatory matrices (obligation mapping)", "Research on Saudi laws and implementing regulations"],
    questions: ["How would you build a compliance obligations register for a new business line?", "What does PDPL require for cross-border data transfers?", "How do you explain a regulatory risk to a non-lawyer?"],
  },
  {
    key: "regulatory",
    label: "Regulatory & Government",
    labelAr: "التنظيمي والحكومي",
    whatTheyTest: ["Navigating regulators and laws portals", "Policy reading", "Bilingual drafting"],
    saudiLawToRevise: ["How to read Royal Decrees, Council of Ministers resolutions and implementing regulations", "Foreign investment (MISA) framework", "Sector regulators relevant to the role"],
    yourEvidence: ["Research on Saudi laws and implementing regulations", "Bilingual Arabic-English drafting"],
    questions: ["Where do you find the authoritative text of a Saudi regulation, and how do you confirm it is current?", "Summarise a recent regulatory change you followed and its practical impact."],
  },
];
