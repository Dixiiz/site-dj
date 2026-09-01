import { CreateSlotForm, SlotActions } from "@/components/slot-admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CreneauxPage() {
  const supabase = createAdminClient();
  const { data: slots } = await supabase
    .from("slots")
    .select("*, bookings(id, customer_name, status)")
    .gte("slot_date", new Date().toISOString().slice(0, 10))
    .order("slot_date")
    .order("start_time");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Créneaux</h1>
        <p className="text-sm text-muted-foreground">
          Ouvre ou ferme des dates. Les vendredis et samedis des 60 prochains jours sont déjà
          préremplis.
        </p>
      </div>

      <CreateSlotForm />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Horaire</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Réservation</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(slots ?? []).map((slot) => {
            const bookings = (slot.bookings ?? []) as {
              id: string;
              customer_name: string;
              status: string;
            }[];
            const active = bookings.find((booking) => booking.status !== "annule");
            return (
              <TableRow key={slot.id}>
                <TableCell>
                  {new Date(slot.slot_date + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </TableCell>
                <TableCell>
                  {String(slot.start_time).slice(0, 5)} – {String(slot.end_time).slice(0, 5)}
                </TableCell>
                <TableCell>
                  <Badge variant={slot.is_open ? "default" : "outline"}>
                    {slot.is_open ? "Ouvert" : "Fermé"}
                  </Badge>
                </TableCell>
                <TableCell>{active ? active.customer_name : "—"}</TableCell>
                <TableCell className="text-right">
                  <SlotActions id={slot.id} isOpen={slot.is_open} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
