import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";

/** LEXHUNT_PASSWORD_HASH format: scrypt$<salt-hex>$<hash-hex>  (generate with `npm run hash-password -- "pw"`) */
export function checkPassword(pw: string): { ok: boolean; configured: boolean } {
  const stored = process.env.LEXHUNT_PASSWORD_HASH;
  if (stored?.startsWith("scrypt$")) {
    const [, saltHex, hashHex] = stored.split("$");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(pw, Buffer.from(saltHex, "hex"), expected.length);
    return { ok: timingSafeEqual(expected, actual), configured: true };
  }
  const plain = process.env.LEXHUNT_PASSWORD;
  if (plain) {
    const a = Buffer.from(pw);
    const b = Buffer.from(plain);
    return { ok: a.length === b.length && timingSafeEqual(a, b), configured: true };
  }
  return { ok: false, configured: false };
}
