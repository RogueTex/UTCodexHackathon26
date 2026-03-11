export function logMetadataEvent(
  event: string,
  details?: Record<string, unknown>,
): void {
  const prefix = "[BevoFix metadata]";
  if (details) {
    console.info(`${prefix} ${event}`, details);
    return;
  }

  console.info(`${prefix} ${event}`);
}

