/** Creates tables and seeds data in the configured database:  npm run db:migrate */
import { getDb } from "@/lib/db";

getDb()
  .then((db) => {
    console.log(`Schema ready (${db.kind}).`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
