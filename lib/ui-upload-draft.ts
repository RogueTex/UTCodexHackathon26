export const UI_UPLOAD_DRAFT_KEY = "bevofix:ui-upload-draft";

export type UiUploadDraft = {
  previewDataUrl: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  selectedAt: string;
};

function isValidDraft(value: unknown): value is UiUploadDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<UiUploadDraft>;
  return (
    typeof draft.previewDataUrl === "string" &&
    draft.previewDataUrl.length > 0 &&
    typeof draft.fileName === "string" &&
    typeof draft.fileSizeBytes === "number" &&
    Number.isFinite(draft.fileSizeBytes) &&
    typeof draft.fileType === "string" &&
    typeof draft.selectedAt === "string"
  );
}

export function readUiUploadDraft(): UiUploadDraft | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = window.sessionStorage.getItem(UI_UPLOAD_DRAFT_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isValidDraft(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeUiUploadDraft(draft: UiUploadDraft): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(UI_UPLOAD_DRAFT_KEY, JSON.stringify(draft));
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("FileReader did not return a string result."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("FileReader failed."));
    };
    reader.readAsDataURL(file);
  });
}
