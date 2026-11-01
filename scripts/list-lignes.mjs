// Liste tous les noms de lignes (options + suppléments) de tous les devis.
// Usage : node scripts/list-lignes.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
const sb = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const { data } = await sb.from("quotes").select("customer_name,selected_options");
const seen = new Map();
for (const q of data ?? []) {
  for (const o of q.selected_options ?? []) {
    const key = `${o.name} | ${o.price_cents ?? 0}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(q.customer_name);
  }
}
for (const [k, v] of seen) {
  console.log(`${k}  →  ${v.length > 1 ? `${v.length} devis (${v[0]}…)` : v[0]}`);
}
