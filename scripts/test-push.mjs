// Test push : envoie une notification à tous les appareils admin abonnés.
// Usage : node scripts/test-push.mjs
import fs from "node:fs";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth");
if (error) throw new Error(error.message);
if (!data?.length) {
  console.log("Aucun appareil abonné.");
  process.exit(0);
}

const results = await Promise.allSettled(
  data.map((sub) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: "🔔 Notifications activées !",
        body: "Test réussi — tu recevras ici les devis, messages et acomptes de tes clients.",
        url: "/admin",
      })
    )
  )
);
results.forEach((r, i) => {
  if (r.status === "fulfilled") console.log(`Appareil ${i + 1} : envoyé ✓ (${r.value.statusCode})`);
  else console.log(`Appareil ${i + 1} : ÉCHEC ${r.reason?.statusCode} ${r.reason?.body ?? r.reason?.message}`);
});
