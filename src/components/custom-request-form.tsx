"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { submitCustomRequest } from "@/app/actions";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CustomRequestForm() {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitCustomRequest(formData);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <FadeIn>
      <form action={onSubmit} className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customer_name">Nom complet</Label>
            <Input id="customer_name" name="customer_name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer_email">E-mail</Label>
            <Input id="customer_email" name="customer_email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer_phone">Téléphone</Label>
            <Input id="customer_phone" name="customer_phone" type="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event_date">Date souhaitée</Label>
            <Input id="event_date" name="event_date" type="date" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="event_location">Lieu de l’événement</Label>
            <Input id="event_location" name="event_location" required />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Ton projet</Label>
            <Textarea id="notes" name="notes" placeholder="Décris-nous tes besoins, envies, contraintes..." />
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Enregistrement…" : "Envoyer ma demande"}
        </Button>
      </form>
    </FadeIn>
  );
}
