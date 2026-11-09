/** External search links for platforms that cannot be queried automatically (terms / no public API). */
const enc = encodeURIComponent;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-|-$/g, "");

export interface SearchLink {
  platform: string;
  url: string;
  note: string;
}

export function searchLinks(query: string): SearchLink[] {
  const isArabic = /[؀-ۿ]/.test(query);
  const links: SearchLink[] = [
    { platform: "LinkedIn Jobs", url: `https://www.linkedin.com/jobs/search/?keywords=${enc(query)}&location=${enc("Riyadh, Saudi Arabia")}&f_E=1%2C2&f_TPR=r2592000`, note: "Internship + entry level, last 30 days" },
    { platform: "Indeed Saudi Arabia", url: `https://sa.indeed.com/jobs?q=${enc(query)}&l=${enc("Riyadh")}&fromage=30`, note: "Last 30 days" },
    { platform: "Google Jobs", url: `https://www.google.com/search?q=${enc(`${query} Riyadh`)}&ibp=htl;jobs`, note: "Aggregates many boards" },
    { platform: "Glassdoor", url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${enc(query)}&locKeyword=${enc("Riyadh")}`, note: "" },
    { platform: "X (Twitter) — Arabic legal jobs", url: `https://x.com/search?q=${enc(`${isArabic ? query : "محامي متدرب"} الرياض`)}&f=live`, note: "Many Saudi firms post here (e.g. @jobs_lawyer)" },
    { platform: "Jadarat (جدارات)", url: "https://jadarat.sa/", note: "Official national employment portal — login and on-site search required" },
  ];
  if (!isArabic) {
    links.splice(2, 0,
      { platform: "Bayt", url: `https://www.bayt.com/en/saudi-arabia/jobs/${slug(query)}-jobs-in-riyadh/`, note: "" },
      { platform: "GulfTalent", url: `https://www.gulftalent.com/saudi-arabia/jobs/riyadh/title/${slug(query)}`, note: "" },
      { platform: "Naukrigulf", url: `https://www.naukrigulf.com/${slug(query)}-jobs-in-riyadh`, note: "" },
    );
  } else {
    links.splice(2, 0, { platform: "Bayt (Arabic)", url: `https://www.bayt.com/ar/saudi-arabia/jobs/?q=${enc(query)}`, note: "" });
  }
  return links;
}
