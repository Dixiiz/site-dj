"use client";

import { updateQuoteStatus } from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function QuoteStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  return (
    <Select
      value={status}
      onValueChange={(value) => {
        if (!value) return;
        const data = new FormData();
        data.set("id", id);
        data.set("status", value);
        void updateQuoteStatus(data);
      }}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="nouveau">Nouveau</SelectItem>
        <SelectItem value="contacte">Contacté</SelectItem>
        <SelectItem value="attente_signature">En attente de signature</SelectItem>
        <SelectItem value="confirme">Confirmé</SelectItem>
        <SelectItem value="refuse">Refusé</SelectItem>
      </SelectContent>
    </Select>
  );
}
