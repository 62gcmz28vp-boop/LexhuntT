/** Checks which candidate ATS board tokens in src/data/atsBoards.ts actually exist:  npm run probe:ats */
import { ATS_BOARDS } from "@/data/atsBoards";
import { boardUrl } from "@/lib/discovery/sources/ats";

(async () => {
  for (const b of ATS_BOARDS) {
    const url = boardUrl(b);
    try {
      const res = await fetch(url, { headers: { "User-Agent": "LexhuntBot/1.0 (probe)" }, signal: AbortSignal.timeout(10000) });
      console.log(`${res.status === 200 ? "OK  " : "MISS"} ${res.status} ${b.provider}:${b.token} (${b.employer})`);
    } catch (e) {
      console.log(`ERR  ${b.provider}:${b.token} ${(e as Error).message}`);
    }
  }
})();
