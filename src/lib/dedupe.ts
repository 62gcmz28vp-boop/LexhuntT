/** Vacancy de-duplication across sources. */
const STOP = new Set(["llp", "llc", "law", "firm", "lawfirm", "company", "co", "and", "the", "partners", "legal", "consultants", "&", "ltd", "limited", "sa", "ksa", "شركة", "مكتب", "للمحاماة", "والاستشارات", "القانونية"]);
const TITLE_STOP = new Set(["the", "a", "an", "of", "for", "in", "at", "-", "–", "/", "riyadh", "ksa", "saudi", "arabia", "الرياض"]);

function tokens(s: string, stop: Set<string>) {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[()\[\],.:;|!?'"’]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !stop.has(t));
}

export function employerKey(employer: string) {
  return tokens(employer, STOP).sort().join("-") || employer.toLowerCase();
}

export function titleTokens(title: string) {
  return tokens(title, TITLE_STOP);
}

export function dedupeKey(employer: string, title: string, location?: string | null) {
  const city = /riyadh|الرياض/i.test(location ?? "") ? "riyadh" : (location ?? "").toLowerCase().split(/[,\s]/)[0] || "na";
  return `${employerKey(employer)}|${titleTokens(title).join("-")}|${city}`;
}

export function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

/** Two listings are the same vacancy if employer matches and titles are ≥ 0.75 similar. */
export function isSameVacancy(a: { employer: string; title: string }, b: { employer: string; title: string }) {
  return employerKey(a.employer) === employerKey(b.employer) && jaccard(titleTokens(a.title), titleTokens(b.title)) >= 0.75;
}
