"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import {
  fileToDataUrl,
  writeUiUploadDraft,
} from "@/lib/ui-upload-draft";

export function LandingPage() {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  function openFilePicker() {
    uploadInputRef.current?.click();
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const previewDataUrl = await fileToDataUrl(file);
      writeUiUploadDraft({
        previewDataUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType: file.type,
        selectedAt: new Date().toISOString(),
      });
      router.push("/form");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="landing-noise relative flex min-h-screen flex-col overflow-hidden bg-ut-cream">
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl text-center">
          <div className="mb-12 animate-fadeUp">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[24px] bg-ut-burnt shadow-[0_8px_32px_rgba(192,80,26,0.35)]">
              <span className="text-5xl text-white">🤘</span>
            </div>
            <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ut-charcoal">
              Bevo<span className="text-ut-burnt">Fix</span>
            </h1>
            <div className="mx-auto mt-4 max-w-[520px] text-center">
              <p className="text-sm font-semibold text-ut-charcoal">
                Made for the Open AI Academy Hackathon 2026
              </p>
              <p className="mt-1 text-sm text-ut-mid">
                by Raghu and Keenan,
              </p>
              <a
                href="https://github.com/RogueTex/UTCodexHackathon26"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-ut-burnt hover:text-ut-burntHover"
              >
                Click here for the entire Repo!
              </a>
            </div>
          </div>

          <p className="mb-12 font-display text-4xl font-black leading-tight tracking-tight text-ut-charcoal md:text-6xl">
            See it. Snap it. Fix it.
          </p>

          <div
            className="mx-auto w-full max-w-[480px] animate-fadeUp rounded-ut border-2 border-dashed border-ut-faint bg-ut-white p-10 text-center shadow-utMd"
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
              }
            }}
          >
            <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[18px] bg-ut-creamDark text-3xl">
              📸
            </div>
            <h2 className="mb-2 font-display text-3xl font-bold text-ut-charcoal">
              Drop a photo to get started
            </h2>
            <p className="mb-6 text-sm leading-6 text-ut-mid">
              Broken chair? Free pizza? Flickering light? Anything worth the campus
              knowing.
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-ut-burnt px-8 py-3 text-sm font-semibold text-white transition hover:bg-ut-burntHover"
            >
              <span>📎</span>
              Upload or take a photo
            </button>
            <p className="mt-4 text-xs text-ut-mid/80">
              JPG · PNG · HEIC - or tap to use camera
            </p>
          </div>
        </div>
      </main>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />
    </div>
  );
}
