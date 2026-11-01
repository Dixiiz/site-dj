// Audit mobile complet : détecte chaque élément qui déborde de l'écran
// (375px iPhone) côté admin ET côté client.
// Usage : node tests/audit-mobile.mjs
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const PORT = 3314;
const base = `http://localhost:${PORT}`;
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);
const adminDb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const EMAIL = `e2e-mobile-${stamp}@test-propulsound.local`;
const PASSWORD = "Test123456!";

// Devis RICHE pour déclencher tous les cas : badges longs, acompte payé,
// options, suppléments, échéancier…
const { data: quote, error: qErr } = await adminDb
  .from("quotes")
  .insert({
    customer_name: "Client Audit Mobile Très Long Nom",
    customer_email: EMAIL,
    customer_phone: "06 12 34 56 78",
    formula_name: "Mariage Essentiel",
    formula_price_cents: 129000,
    total_cents: 189000,
    status: "confirme",
    acompte_required: true,
    acompte_paid_at: "2026-06-01T10:30:00Z",
    event_date: "2026-12-19",
    event_location: "Salle des Fêtes de la Grande Halle du Château de Test très loin",
    start_time: "19:00",
    end_time: "04:00",
    notes:
      "Message : Bonjour, ceci est un message client assez long pour tester les débordements.\nDébut : 19:00 | Fin : 04:00 | Heures supplémentaires : 3 h (240,00 €)",
    selected_options: [
      { id: "o1", name: "Pistolet à fumée effet CO2 × 2", price_cents: 50000, qty: 2 },
      { id: "o2", name: "Machine à fumée lourde", price_cents: 25000, qty: 1 },
    ],
    travel_distance_km: 42,
    travel_fee_cents: 3000,
    extra_fee_cents: 24000,
    extra_fee_label: "3 h supplémentaires",
  })
  .select()
  .single();
if (qErr || !quote) {
  console.error("❌ Création devis impossible :", qErr?.message);
  process.exit(1);
}
// Échéancier (x3).
await adminDb.from("payment_schedule").insert([
  { quote_id: quote.id, numero: 1, total: 3, amount_cents: 63000, due_date: "2026-09-15", status: "payee" },
  { quote_id: quote.id, numero: 2, total: 3, amount_cents: 63000, due_date: "2026-10-15", status: "attente" },
  { quote_id: quote.id, numero: 3, total: 3, amount_cents: 63000, due_date: "2026-11-15", status: "attente" },
]);

const { data: created, error: uErr } = await adminDb.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { name: "Client Audit Mobile" },
});
if (uErr) {
  console.error("❌ Création compte impossible :", uErr.message);
  await adminDb.from("quotes").delete().eq("id", quote.id);
  process.exit(1);
}

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const server = spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: ["ignore", "pipe", "pipe"],
});
const serverLog = [];
server.stdout.on("data", (d) => serverLog.push(d.toString()));
server.stderr.on("data", (d) => serverLog.push(d.toString()));
await new Promise((r) => setTimeout(r, 12000));

// Ouvre tous les <details> visibles (accordéons admin).
async function openAllDetails(page) {
  for (let i = 0; i < 12; i++) {
    const closed = page.locator("details:not([open]) > summary");
    const n = await closed.count();
    if (n === 0) break;
    await closed.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

// Audit : éléments qui débordent de la fenêtre (hors containers scrollables).
async function audit(page, label) {
  const results = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    const isScrollable = (el) => {
      let a = el.parentElement;
      while (a) {
        const s = getComputedStyle(a);
        if (/(auto|scroll)/.test(`${s.overflowX}${s.overflow}`) && a.scrollWidth > a.clientWidth + 1) return true;
        a = a.parentElement;
      }
      return false;
    };
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.right > vw + 0.5 || r.left < -0.5) && !isScrollable(el)) {
        const cls = (typeof el.className === "string" ? el.className : "").slice(0, 90);
        offenders.push(`<${el.tagName.toLowerCase()} class="${cls}"> L=${Math.round(r.left)} R=${Math.round(r.right)} (vw=${vw})`);
      }
    }
    const pageOverflow = document.documentElement.scrollWidth > vw + 1;
    return { vw, pageOverflow, offenders: offenders.slice(0, 15), total: offenders.length };
  });
  const ok = !results.pageOverflow && results.total === 0;
  console.log(`${ok ? "✅" : "❌"} ${label} — vw=${results.vw} scrollWidth>vw=${results.pageOverflow} éléments débordants=${results.total}`);
  for (const o of results.offenders) console.log(`   ↳ ${o}`);
  return ok;
}

const browser = await chromium.launch();
let failures = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, locale: "fr-FR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("🔥 PAGEERROR:", e.message.slice(0, 200)));

  // ---------- ADMIN ----------
  await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill("#password", env.ADMIN_PASSWORD);
  await page.click('button:has-text("Connexion")');
  await page.waitForTimeout(4000);

  await page.goto(`${base}/admin/devis`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  (await audit(page, "admin/devis (fermé)")) || failures++;
  await openAllDetails(page);
  await page.waitForTimeout(1500);
  (await audit(page, "admin/devis (accordéons ouverts)")) || failures++;
  const editBtn = page.locator('button:has-text("Modifier")').first();
  if (await editBtn.count()) {
    await editBtn.click();
    await page.waitForTimeout(800);
    (await audit(page, "admin/devis (formulaire Modifier ouvert)")) || failures++;
  }

  for (const p of ["/admin", "/admin/factures", "/admin/planning", "/admin/comptes", "/admin/medias", "/admin/menuiserie"]) {
    await page.goto(`${base}${p}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    (await audit(page, `admin ${p}`)) || failures++;
  }

  // ---------- CLIENT ----------
  await page.goto(`${base}/connexion`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button:has-text("Se connecter")');
  await page.waitForURL(/mon-espace/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  (await audit(page, "client /mon-espace")) || failures++;

  await page.goto(`${base}/mon-espace/devis/${quote.id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  (await audit(page, "client devis (détail)")) || failures++;
  await openAllDetails(page);
  await page.waitForTimeout(1000);
  (await audit(page, "client devis (accordéons ouverts)")) || failures++;

  for (const p of ["/", "/formules", "/contact", "/faq", "/connexion"]) {
    await page.goto(`${base}${p}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    (await audit(page, `public ${p}`)) || failures++;
  }

  console.log(failures === 0 ? "\n🎉 AUCUN débordement mobile" : `\n💥 ${failures} page(s) avec débordement(s)`);
} finally {
  server.kill("SIGTERM");
  await adminDb.auth.admin.deleteUser(created.user.id).catch(() => {});
  await adminDb.from("payment_schedule").delete().eq("quote_id", quote.id);
  await adminDb.from("quotes").delete().eq("id", quote.id);
  console.log("🧹 Nettoyage fait");
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
}
