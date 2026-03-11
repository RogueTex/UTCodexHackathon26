import { Mode } from "@/lib/bevofix";
import { PhotoMetadata } from "@/lib/location-hints";
import { AnalyzeResponse } from "@/lib/types";

export const assistantDraftStorageKey = "bevofix:draft:assistant";

export type StoredAssistantDraft = AnalyzeResponse & {
  imagePreview?: string;
  imageName?: string;
  exampleId?: string;
  notes?: string;
  photoMetadata?: PhotoMetadata;
  analyzedAt: string;
  preferredMode?: Mode;
};
