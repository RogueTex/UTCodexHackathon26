const BYOK_STORAGE_KEY = "bevofix:openai-api-key";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readByokApiKey(): string | undefined {
  if (!canUseStorage()) {
    return undefined;
  }

  try {
    const value = window.localStorage.getItem(BYOK_STORAGE_KEY)?.trim();
    return value ? value : undefined;
  } catch {
    return undefined;
  }
}

export function writeByokApiKey(value: string): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    const trimmed = value.trim();
    if (!trimmed) {
      window.localStorage.removeItem(BYOK_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(BYOK_STORAGE_KEY, trimmed);
  } catch {
    // Ignore storage failures so user flow continues.
  }
}

export function clearByokApiKey(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(BYOK_STORAGE_KEY);
  } catch {
    // Ignore storage failures so user flow continues.
  }
}
