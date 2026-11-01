import { NextResponse } from "next/server";

// Lien court sur notre domaine, utilisé dans les e-mails clients :
// les filtres anti-spam pénalisent les e-mails dont les URLs ne
// correspondent pas au domaine d'expédition. On redirige ensuite vers
// le formulaire d'avis Google.
export async function GET() {
  return NextResponse.redirect(
    "https://g.page/r/CYgCQMSAgDcWEAE/review",
    302,
  );
}
