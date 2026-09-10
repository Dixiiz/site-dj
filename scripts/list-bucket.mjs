// Liste le contenu du bucket site-media/videos/showcase (debug).
// Usage : node scripts/list-bucket.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.storage.from("site-media").list("videos/showcase", { limit: 200 });
for (const f of data ?? []) console.log(f.name, f.metadata?.size ?? "");
