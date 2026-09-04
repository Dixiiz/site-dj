// Génération de fichiers .ics (calendrier universel : Apple, Google,
// Outlook, Android). Utilisé par les routes /api/calendar/*.
export function buildIcs(opts: {
  uid: string;
  title: string;
  description: string;
  location?: string | null;
  /** Date de début locale "YYYY-MM-DD" + heure "HH:MM" */
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const stamp = (d: string, h: string) => `${d.replace(/-/g, "")}T${h.replace(":", "")}00`;
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PropulSound DJ//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@propulsounddj.fr`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${stamp(opts.date, opts.startTime)}`,
    `DTEND:${stamp(opts.date, opts.endTime)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    opts.location ? `LOCATION:${esc(opts.location)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel — demain !",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
