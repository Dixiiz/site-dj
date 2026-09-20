import { NextResponse } from "next/server";

// Lien court sur notre domaine pour les e-mails (voir avis/google/route.ts).
export async function GET() {
  return NextResponse.redirect(
    "https://www.mariages.net/musique-mariage/propulsound-dj--e366139",
    302,
  );
}
