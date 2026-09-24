// From frontend: node supabase/tests/run-pglite.mjs
// Optional: pass an absolute path to a separately installed PGlite dist/index.js.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2]
  ? pathToFileURL(process.argv[2]).href
  : '@electric-sql/pglite');
const db = new PGlite(); // In-memory only: never connects to Supabase or DATABASE_URL.
try {
  for (const file of ['scaffolding.sql', '../migrations/20260924000100_baseline.sql', 'legacy.sql', '../migrations/20260924000200_hardening.sql', 'upgrade.sql', 'security.sql']) {
    await db.exec(await readFile(new URL(file, import.meta.url), 'utf8'));
    console.log(`PASS ${file}`);
  }
} finally {
  await db.close();
}
