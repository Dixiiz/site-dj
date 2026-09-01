"use client";

import { useState } from "react";
import { loginAdmin } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await loginAdmin(formData);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form action={onSubmit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-xl border border-white/10 p-6">
      <h1 className="text-xl font-medium">Espace admin</h1>
      <p className="text-sm text-muted-foreground">
        Mot de passe défini dans <code>.env.local</code> (ADMIN_PASSWORD).
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full">
        Connexion
      </Button>
    </form>
  );
}
