import { createAdminClient } from "@/lib/supabase/admin";

function sizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

// Fichiers envoyés par le client, téléchargeables depuis le détail du devis.
export async function AdminQuoteFiles({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const { data: files } = await supabase
    .from("quote_files")
    .select("id, name, mime_type, size_bytes, moment")
    .eq("quote_id", quoteId)
    .eq("from_admin", false)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Fichiers du client
      </h3>
      {!files || files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun fichier envoyé.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm sm:gap-3"
            >
              <span className="shrink-0">
                {file.mime_type?.startsWith("video")
                  ? ""
                  : file.mime_type?.startsWith("audio")
                    ? ""
                    : ""}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.moment ? `${file.moment} · ` : "Divers · "}
                  {sizeLabel(file.size_bytes)}
                </p>
              </div>
              <a
                href={`/api/files/${file.id}`}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/15"
              >
                ↓ Télécharger
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
