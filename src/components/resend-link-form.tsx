"use client";

// Formulaire de renvoi de lien affiché sur /connexion/reinitialiser quand le
// lien d'activation / réinitialisation reçu par e-mail est invalide ou expiré
// (validité Supabase par défaut : 1 h). Le client saisit son e-mail et reçoit
// un nouveau lien frais par le même canal que le premier envoi (Resend), via
// l'action sendFirstLoginLink qui crée aussi le compte si nécessaire.
import { useState, useTransition } from "react";
import { sendFirstLoginLink } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendLinkForm() {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData: FormData) => {
        setError(null);
        setInfo(null);
        startTransition(async () => {
          const result = await sendFirstLoginLink(formData);
          if (result && !result.ok) setError(result.error ?? "Une erreur est survenue.");
          if (result && result.ok && result.message) setInfo(result.message);
        });
      }}
      className="space-y-4 rounded-xl border border-border p-6"
    >
      <div className="space-y-1.5">
        <Label htmlFor="resend-email">Votre e-mail</Label>
        <Input id="resend-email" name="email" type="email" required autoComplete="email" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? <p className="text-sm text-accent">{info}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un nouveau lien"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Utilisez l&apos;e-mail de votre devis — un nouveau lien (valable 7 jours) vous sera envoyé,
        votre accès s&apos;ouvrira pour 1 heure au clic.
      </p>
    </form>
  );
}
