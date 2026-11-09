/**
 * Public ATS job boards for Riyadh employers that hire legal / compliance graduates.
 * These official JSON endpoints are designed for public consumption (job widgets).
 * Board tokens below are CANDIDATES — the build sandbox could not reach the ATS hosts to confirm them.
 * Run `npm run probe:ats` after deployment (or locally with internet) and keep only boards that respond 200.
 * Discovery records a 404 as "board not found" in the Coverage report rather than failing.
 */
export type AtsProvider = "greenhouse" | "lever" | "workable" | "smartrecruiters" | "ashby";
export interface AtsBoard {
  provider: AtsProvider;
  token: string;
  employer: string;
  category: "in_house" | "financial" | "consulting" | "law_firm_international" | "other";
}

export const ATS_BOARDS: AtsBoard[] = [
  { provider: "greenhouse", token: "tabby", employer: "Tabby", category: "financial" },
  { provider: "lever", token: "tamara", employer: "Tamara", category: "financial" },
  { provider: "greenhouse", token: "careem", employer: "Careem", category: "in_house" },
  { provider: "lever", token: "lean", employer: "Lean Technologies", category: "financial" },
  { provider: "workable", token: "foodics", employer: "Foodics", category: "in_house" },
  { provider: "smartrecruiters", token: "Aramco", employer: "Saudi Aramco", category: "in_house" },
  { provider: "smartrecruiters", token: "NEOM", employer: "NEOM", category: "in_house" },
  { provider: "ashby", token: "salla", employer: "Salla", category: "in_house" },
];
