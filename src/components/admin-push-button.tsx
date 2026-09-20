"use client";

// Bouton d'activation des notifications push de l'admin.
// États : activé (abonnement existant) / désactivé / non supporté.
// La clé publique VAPID est passée par le serveur (variable d'environnement).
import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push-client";

export function AdminPushButton({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<"loading" | "on" | "off" | "unsupported" | "nokey">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // await : sort du contexte synchrone (règle react-hooks/set-state-in-effect).
      await Promise.resolve();
      if (cancelled) return;
      if (!vapidPublicKey) return setState("nokey");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState("unsupported");
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setState(existing ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setState("on");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported" || state === "nokey") return null;

  return state === "on" ? (
    <button
      type="button"
      onClick={unsubscribe}
      disabled={busy}
      className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-60"
    >
      Notifications activées — désactiver
    </button>
  ) : (
    <button
      type="button"
      onClick={subscribe}
      disabled={busy}
      className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
    >
      {busy ? "…" : "Activer les notifications push"}
    </button>
  );
}
