function readMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "No se pudo completar la acción.";
}

export function humanError(error: unknown) {
  const message = readMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (lower.includes("email not confirmed")) return "Falta confirmar el correo. Revisa la bandeja de entrada.";
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "Ese correo ya tiene cuenta.";
  }
  if (lower.includes("database error saving new user") || lower.includes("invitación")) {
    return "No se pudo crear la cuenta. Revisa el código del taller.";
  }
  if (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("could not find")) {
    return "No se ha podido completar. Avisa a administración.";
  }
  if (lower.includes("ya tienes un fichaje")) return "Ya tienes un fichaje abierto.";
  if (lower.includes("no tienes un fichaje")) return "No tienes un fichaje abierto.";
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "No tienes permiso para esta acción.";
  }
  if (lower.includes("tiene que quedar un administrador")) {
    return "Tiene que quedar un administrador activo.";
  }
  if (lower.includes("la reparación no tiene importe")) {
    return "Pon un coste antes de crear la factura.";
  }
  if (/schema|supabase|postgres|pgrst|jwt|relation |column |function |violates|duplicate key|stack|sql/i.test(lower)) {
    return "No se ha podido completar. Avisa a administración.";
  }
  return message;
}
