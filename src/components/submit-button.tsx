"use client";

import { useFormStatus } from "react-dom";

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

// Bouton de soumission avec retour visuel pendant l'exécution de la
// server action : roue qui tourne + libellé d'attente + impulsion.
export function SubmitButton({
  children,
  className = "",
  pendingLabel = "Génération…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? "animate-pulse cursor-wait opacity-90" : ""} disabled:opacity-90`}
      aria-busy={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
