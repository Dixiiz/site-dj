// Côté CLIENT : résumé des appels avec Maxime, mis au propre.
// Composant serveur pur (aucun état) : les comptes rendus publiés arrivent
// en props depuis la page de l'espace client.
export function ClientCallReports({
  reports,
}: {
  reports: {
    id: string;
    called_at: string;
    contact: string | null;
    summary: string;
    key_points: string[] | null;
    next_steps: string[] | null;
  }[];
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/50 p-5">
      <h2 className="font-medium">📞 Nos échanges téléphoniques</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Le compte rendu de nos appels, pour que rien ne se perde.
      </p>
      <ul className="mt-4 space-y-4">
        {reports.map((report) => (
          <li
            key={report.id}
            className="rounded-xl border border-border bg-background p-4 text-sm"
          >
            <p className="font-medium text-accent">
              Appel du{" "}
              {new Date(report.called_at).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" à "}
              {new Date(report.called_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {report.contact ? ` — avec ${report.contact}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{report.summary}</p>
            {(report.key_points ?? []).length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ce qu&apos;on a décidé
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {(report.key_points ?? []).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(report.next_steps ?? []).length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Et maintenant
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {(report.next_steps ?? []).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
