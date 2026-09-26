/** Maps register_team RPC error messages to user-facing copy. */
export function registrationErrorToMessage(raw: string | undefined): string {
  const msg = raw ?? "UNKNOWN";
  const [code, detail] = msg.includes(":") ? msg.split(":", 2) : [msg, undefined];
  switch (code) {
    case "AUTH_REQUIRED":
      return "You must be signed in to register.";
    case "RULES_NOT_ACCEPTED":
      return "You must accept the tournament rules.";
    case "INVALID_WHATSAPP":
      return "Enter a valid WhatsApp number (at least 10 digits).";
    case "TOURNAMENT_NOT_FOUND":
      return "This tournament doesn't exist or was archived.";
    case "NOT_OPEN_YET":
      return "Registrations aren't open yet for this tournament.";
    case "CLOSED":
      return "Registrations are closed for this tournament.";
    case "FULL":
      return "All slots are taken. Better luck next time!";
    case "ALREADY_REGISTERED":
      return "You already have a registration for this tournament.";
    case "GUEST_NAME_REQUIRED":
      return "Your name is required to register without an account.";
    case "DUPLICATE_WHATSAPP":
      return "This WhatsApp number is already registered in this tournament.";
    case "TOO_FEW_PLAYERS":
      return "Your team doesn't have enough players for this format.";
    case "TOO_MANY_PLAYERS":
      return "Your team has too many players (including substitutes).";
    case "MISSING_IGN":
      return "Every player needs an in-game name.";
    case "INVALID_UID":
      return `Invalid game UID${detail ? ` (${detail})` : ""} — UIDs are 5–12 digits.`;
    case "DUPLICATE_UID":
      return `UID ${detail ?? ""} is already registered in this tournament.`;
    default:
      return `Registration failed: ${msg}`;
  }
}
