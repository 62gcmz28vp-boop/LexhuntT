import { scryptSync, randomBytes } from "node:crypto";

const pw = process.argv[2];
if (!pw) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw, salt, 64).toString("hex");
console.log("LEXHUNT_PASSWORD_HASH=" + ["scrypt", salt.toString("hex"), hash].join("$"));
