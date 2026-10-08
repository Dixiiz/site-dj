"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ email }: { email?: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const result = await updatePassword(formData);
          if (result && !result.ok) setError(result.error ?? "Une erreur est survenue.");
        });
      }}
      className="space-y-4 rounded-xl border border-border p-6"
    >
      {email ? (
        <p className="text-sm text-muted-foreground">
          Compte : <strong className="text-foreground">{email}</strong>
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="password">Votre mot de passe</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer et accéder à mon espace"}
      </Button>
    </form>
  );
}
