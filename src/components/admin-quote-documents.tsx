import { deleteAdminDocument, downloadQuoteFile, uploadAdminDocument } from "@/app/client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdminClient } from "@/lib/supabase/admin";

type FileRow = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
};

// Documents officiels envoyés au client (contrat, devis signé…).
export async function AdminQuoteDocuments({ quoteId }: { quoteId: string }) {
  const supabase = createAdminClient();
  const { data: files } = await supabase
    .from("quote_files")
    .select("id, name, mime_type, size_bytes")
    .eq("quote_id", quoteId)
    .eq("from_admin", true)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Documents envoyés au client (contrat, devis signé…)
      </h3>
      {files && files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm sm:gap-3"
            >
              <span className="shrink-0">📄</span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-medium">{file.name}</p>
              </div>
              <form action={downloadQuoteFile}>
                <input type="hidden" name="quote_id" value={quoteId} />
                <input type="hidden" name="file_id" value={file.id} />
                <Button type="submit" variant="outline" size="sm">
                  Télécharger
                </Button>
              </form>
              <form action={deleteAdminDocument}>
                <input type="hidden" name="quote_id" value={quoteId} />
                <input type="hidden" name="file_id" value={file.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        action={async (formData) => {
          "use server";
          await uploadAdminDocument(formData);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="quote_id" value={quoteId} />
        <Input
          type="file"
          name="file"
          required
          className="max-w-xs cursor-pointer text-xs file:cursor-pointer file:mr-2 file:rounded-md file:border-0 file:bg-accent/15 file:px-2.5 file:py-1 file:text-xs file:text-accent"
        />
        <Button type="submit" size="sm" variant="outline">
          Envoyer au client
        </Button>
      </form>
    </div>
  );
}
