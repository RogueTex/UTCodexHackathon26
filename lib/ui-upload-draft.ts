export const UI_UPLOAD_DRAFT_KEY = "bevofix:ui-upload-draft";
const MAX_PREVIEW_DIMENSION = 1280;
const MAX_PREVIEW_DATA_URL_LENGTH = 2_000_000;
const JPEG_QUALITIES = [0.82, 0.72, 0.62];

let inMemoryDraft: UiUploadDraft | undefined;

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
    return inMemoryDraft;
  }

  try {
    const raw = window.sessionStorage.getItem(UI_UPLOAD_DRAFT_KEY);
    if (!raw) {
      return inMemoryDraft;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isValidDraft(parsed) ? parsed : inMemoryDraft;
  } catch {
    return inMemoryDraft;
  }
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.code === 22)
  );
}

export function writeUiUploadDraft(draft: UiUploadDraft): void {
  inMemoryDraft = draft;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(UI_UPLOAD_DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      // Keep flow working for very large uploads via in-memory fallback.
      return;
    }
    throw error;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
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

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode selected image."));
    };

    image.src = objectUrl;
  });
}

function drawScaledImage(image: HTMLImageElement, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get canvas 2D context.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function imageFileToCompactDataUrl(file: File): Promise<string> {
  const image = await loadImageFromFile(file);
  const largestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const baseScale =
    largestEdge > MAX_PREVIEW_DIMENSION ? MAX_PREVIEW_DIMENSION / largestEdge : 1;
  const scales = [baseScale, baseScale * 0.85, baseScale * 0.7];

  for (const scale of scales) {
    const canvas = drawScaledImage(image, scale);
    for (const quality of JPEG_QUALITIES) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_PREVIEW_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }
  }

  const smallestCanvas = drawScaledImage(image, scales[scales.length - 1]);
  return smallestCanvas.toDataURL("image/jpeg", JPEG_QUALITIES[JPEG_QUALITIES.length - 1]);
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return readFileAsDataUrl(file);
  }

  try {
    const compactDataUrl = await imageFileToCompactDataUrl(file);
    if (compactDataUrl.length <= MAX_PREVIEW_DATA_URL_LENGTH) {
      return compactDataUrl;
    }
  } catch {
    // Fall back to the original data URL if image decoding/compression fails.
  }

  return readFileAsDataUrl(file);
}
