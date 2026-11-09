/** Bilingual legal-recruitment taxonomy used for discovery relevance, classification and matching. */

export const PRACTICE_AREAS: Record<string, { label: string; labelAr: string; keywords: string[] }> = {
  corporate_ma: {
    label: "Corporate & M&A",
    labelAr: "الشركات والاندماج والاستحواذ",
    keywords: ["m&a", "merger", "acquisition", "corporate", "share purchase", "spa", "due diligence", "shareholder", "joint venture", "private equity", "transaction", "اندماج", "استحواذ", "شركات", "عناية واجبة", "مساهمين", "صفقات"],
  },
  projects_construction: {
    label: "Projects, Construction & Infrastructure",
    labelAr: "المشاريع والإنشاءات والبنية التحتية",
    keywords: ["fidic", "construction", "projects", "infrastructure", "ppp", "public-private", "epc", "energy", "power", "utilities", "giga", "real estate development", "مشاريع", "إنشاءات", "بنية تحتية", "طاقة", "شراكة بين القطاعين"],
  },
  disputes: {
    label: "Disputes & Arbitration",
    labelAr: "النزاعات والتحكيم",
    keywords: ["dispute", "litigation", "arbitration", "claims", "chronology", "court", "pleading", "enforcement", "نزاع", "تقاضي", "تحكيم", "مطالبات", "محاكم", "قضايا"],
  },
  regulatory_compliance: {
    label: "Regulatory, Compliance & Governance",
    labelAr: "التنظيم والامتثال والحوكمة",
    keywords: ["regulatory", "compliance", "governance", "aml", "kyc", "risk", "policy", "licensing", "cma", "sama", "امتثال", "حوكمة", "تنظيمي", "مخاطر", "لوائح", "ترخيص"],
  },
  banking_finance: {
    label: "Banking, Finance & Capital Markets",
    labelAr: "المصرفية والتمويل وأسواق المال",
    keywords: ["banking", "finance", "financing", "capital markets", "sukuk", "debt", "fintech", "ipo", "تمويل", "مصرفي", "أسواق المال", "صكوك"],
  },
  contracts: {
    label: "Contracts & Commercial",
    labelAr: "العقود والتجاري",
    keywords: ["contract", "contracts", "commercial", "drafting", "procurement", "agreement", "tender", "عقود", "عقد", "صياغة", "مشتريات", "تجاري"],
  },
  employment: { label: "Employment", labelAr: "العمل", keywords: ["employment", "labour", "labor", "hr law", "نظام العمل", "عمالي"] },
  ip_tech: { label: "IP, Technology & Data", labelAr: "الملكية الفكرية والتقنية", keywords: ["intellectual property", "trademark", "technology", "data protection", "pdpl", "privacy", "ملكية فكرية", "حماية البيانات"] },
};

/** Titles/phrases that signal a legal or law-adjacent role even without the word "legal". */
export const ROLE_KEYWORDS_EN = [
  "legal", "lawyer", "law firm", "counsel", "paralegal", "attorney", "solicitor", "trainee associate", "trainee lawyer", "legal trainee",
  "junior associate", "associate (law", "legal assistant", "legal analyst", "legal researcher", "legal consultant", "contracts specialist",
  "contract analyst", "contracts analyst", "contracts administrator", "compliance", "governance", "regulatory affairs", "regulatory analyst",
  "risk and compliance", "arbitration", "dispute", "claims analyst", "company secretary", "corporate secretary", "board secretary", "legal operations",
];
export const ROLE_KEYWORDS_AR = ["محامي", "محامية", "قانوني", "قانونية", "مستشار قانوني", "باحث قانوني", "متدرب", "امتثال", "حوكمة", "عقود", "تحكيم", "شؤون قانونية", "أمين سر"];

export const SENIOR_EXCLUDE = ["senior", "head of", "director", "partner", "chief", "general counsel", "principal", "manager", "lead ", "vp ", "vice president", "رئيس", "مدير", "أول"];
export const JUNIOR_HINTS = ["trainee", "graduate", "junior", "entry", "intern", "assistant", "fresh", "co-op", "coop", "متدرب", "حديث تخرج", "حديثي التخرج", "مبتدئ"];

/** Search keyword variations used by aggregator providers and external search links. */
export const SEARCH_QUERIES_EN = [
  "trainee associate", "trainee lawyer", "legal trainee", "graduate trainee lawyer", "junior legal associate", "junior legal counsel",
  "legal assistant", "paralegal", "legal analyst", "legal researcher", "graduate legal consultant", "corporate legal assistant",
  "contracts specialist", "junior contracts analyst", "compliance analyst", "governance specialist", "regulatory affairs analyst",
  "risk and compliance associate", "dispute resolution trainee", "arbitration assistant", "M&A legal trainee", "legal graduate program",
  "legal operations analyst",
];
export const SEARCH_QUERIES_AR = ["محامي متدرب", "محامية متدربة", "باحث قانوني", "مستشار قانوني حديث تخرج", "أخصائي امتثال", "أخصائي عقود", "أخصائي حوكمة", "مساعد قانوني"];

export const RIYADH_HINTS = ["riyadh", "الرياض", "ksa", "saudi", "السعودية", "kingdom of saudi arabia"];

export function norm(s: string) {
  return s.toLowerCase().normalize("NFKC");
}

export function detectPracticeAreas(text: string): string[] {
  const t = norm(text);
  return Object.entries(PRACTICE_AREAS)
    .filter(([, v]) => v.keywords.some((k) => t.includes(k)))
    .map(([k]) => k);
}

export function isLegalRole(title: string, description = ""): boolean {
  const t = norm(title);
  if ([...ROLE_KEYWORDS_EN, ...ROLE_KEYWORDS_AR].some((k) => t.includes(k))) return true;
  // Title doesn't say "legal": accept if the description is strongly legal.
  const d = norm(description);
  const hits = ["law degree", "llb", "bachelor of law", "bachelor's degree in law", "legal", "بكالوريوس القانون", "الأنظمة", "قانون"].filter((k) => d.includes(k)).length;
  return hits >= 2;
}

export function isTooSenior(title: string, description = ""): boolean {
  const t = norm(title);
  if (JUNIOR_HINTS.some((k) => t.includes(k))) return false;
  if (SENIOR_EXCLUDE.some((k) => t.includes(k))) return true;
  const yrs = parseExperience(`${title} ${description}`);
  return yrs.min !== null && yrs.min > 3;
}

export function parseExperience(text: string): { min: number | null; max: number | null } {
  const t = norm(text);
  const range = t.match(/(\d{1,2})\s*(?:-|–|to|إلى)\s*(\d{1,2})\s*(?:\+\s*)?(?:years|yrs|year|سنوات|سنة)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const plus = t.match(/(?:minimum of|at least|min\.?|أكثر من|لا تقل عن)?\s*(\d{1,2})\s*\+?\s*(?:years|yrs|year|سنوات|سنة)/);
  if (plus) return { min: Number(plus[1]), max: null };
  if (/(fresh graduate|no experience|0 years|حديث تخرج|حديثي التخرج)/.test(t)) return { min: 0, max: 0 };
  return { min: null, max: null };
}

export function classifyKind(title: string): import("./types").JobKind {
  const t = norm(title);
  if (/(co-?op|cooperative|تعاوني|intern)/.test(t)) return "co_op";
  if (/(programme|program|graduate development|training contract|برنامج)/.test(t)) return "graduate_programme";
  if (/(trainee|متدرب)/.test(t)) return "trainee";
  if (/paralegal|legal assistant|مساعد قانوني/.test(t)) return "paralegal";
  if (/compliance|governance|regulatory|risk|امتثال|حوكمة/.test(t)) return "compliance";
  if (/contract|عقود/.test(t)) return "contracts";
  if (/research|analyst|باحث/.test(t)) return "research";
  if (/junior|associate|counsel|lawyer|محامي/.test(t)) return "junior";
  return "other";
}

export function detectLicense(text: string): import("./types").LicenseReq {
  const t = norm(text);
  if (/(licensed lawyer|valid (law|legal) licen|practising licen|practicing licen|bar admission|محامي مرخص|رخصة محاماة سارية|ترخيص ساري)/.test(t)) return "licensed_required";
  if (/(trainee licen|legal trainee|registered .* ministry of justice|محامي متدرب|رخصة تدريب|قيد متدرب)/.test(t)) return "trainee_registration";
  if (/(no licen|license not required|unlicensed)/.test(t)) return "not_required";
  return "unknown";
}

export function detectWorkMode(text: string): "onsite" | "hybrid" | "remote" | "unknown" {
  const t = norm(text);
  if (t.includes("hybrid") || t.includes("هجين")) return "hybrid";
  if (t.includes("remote") || t.includes("عن بعد") || t.includes("work from home")) return "remote";
  if (t.includes("on-site") || t.includes("onsite") || t.includes("in office")) return "onsite";
  return "unknown";
}

export function isRiyadhCompatible(location: string, description = "", remote = false): boolean {
  const t = norm(`${location} ${description}`);
  if (RIYADH_HINTS.some((k) => t.includes(k))) return true;
  return remote && (t.includes("saudi") || t.includes("gcc") || t.includes("middle east") || t.includes("anywhere"));
}
