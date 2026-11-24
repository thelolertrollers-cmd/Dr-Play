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
  if (lower.includes("email not confirmed")) {
    return "Falta confirmar el correo. En Supabase, entra en Authentication → Sign In / Providers → Email y desactiva Confirm email.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "Ese correo ya tiene cuenta. Entra desde la pantalla de acceso.";
  }
  if (lower.includes("database error saving new user") || lower.includes("invitación")) {
    return "No se pudo crear la cuenta. Si no es la primera, revisa el código del taller. Si es la primera, ejecuta supabase/schema.sql.";
  }
  if (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("could not find")) {
    return "Faltan las tablas en Supabase. Abre el editor SQL del proyecto y ejecuta supabase/schema.sql.";
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
  return message;
}
