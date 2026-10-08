"use client";

import { useState, useTransition } from "react";
import { loginClient, sendFirstLoginLink, signUpClient } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConnexionForm({
  next,
  initialEmail,
}: {
  next?: string;
  // E-mail prérempli (ex : lien reçu dans un e-mail de documents, avec
  // ?email=…). Utilisé par le mode « première connexion » et la connexion.
  initialEmail?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "first">("login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Destination après connexion (ex : section acompte depuis un e-mail).
  const safeNext = next?.startsWith("/mon-espace") ? next : undefined;

  function onSubmit(action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; message?: string } | undefined>) {
    return (formData: FormData) => {
      setError(null);
      setInfo(null);
      startTransition(async () => {
        const result = await action(formData);
        if (result && !result.ok) setError(result.error ?? "Une erreur est survenue.");
        if (result && result.ok && "message" in result && result.message) {
          setInfo(result.message);
        }
      });
    };
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-6">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setInfo(null);
          }}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            mode === "login" ? "bg-accent/15 font-medium text-accent" : "text-muted-foreground"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setInfo(null);
          }}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            mode === "signup" ? "bg-accent/15 font-medium text-accent" : "text-muted-foreground"
          }`}
        >
          Créer un compte
        </button>
      </div>

      {mode === "login" ? (
        <form action={onSubmit(loginClient)} className="space-y-4">
          {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={initialEmail} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Connexion…" : "Se connecter"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode("first");
              setError(null);
              setInfo(null);
            }}
            className="block w-full text-center text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            Première connexion ?
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Utilisez le même e-mail que celui de votre devis pour retrouver vos dossiers.
          </p>
        </form>
      ) : mode === "first" ? (
        // Première connexion (ou mot de passe oublié) : un seul champ, un lien
        // e-mail, puis choix du mot de passe — sans autre formalité.
        <form action={onSubmit(sendFirstLoginLink)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Recevez un lien par e-mail : vous n’avez plus qu’à choisir votre mot de passe.
            Ça marche aussi si vous l’avez oublié.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="email-first">E-mail de votre devis</Label>
            <Input id="email-first" name="email" type="email" required autoComplete="email" defaultValue={initialEmail} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {info ? <p className="text-sm text-accent">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Envoi…" : "Recevoir mon lien de première connexion"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
            className="block w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Retour à la connexion
          </button>
        </form>
      ) : (
        <form action={onSubmit(signUpClient)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={initialEmail} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {info ? <p className="text-sm text-accent">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Création…" : "Créer mon compte"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Astuce : créez votre compte avec l&apos;e-mail utilisé pour votre devis.
          </p>
        </form>
      )}
    </div>
  );
}
