/** Run one discovery pass from the command line:  npm run discover  */
import { runDiscovery } from "@/lib/discovery";

runDiscovery("cli")
  .then((r) => {
    console.table(r.sources.map((s) => ({ source: s.source, status: s.status, fetched: s.fetched, kept: s.kept, message: s.message.slice(0, 80) })));
    console.log(`new ${r.newJobs} · updated ${r.updatedJobs} · closed ${r.closedJobs} · notifications ${r.notifications}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
