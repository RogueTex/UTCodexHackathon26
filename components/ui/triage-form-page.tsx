"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fileToDataUrl,
  readUiUploadDraft,
  UiUploadDraft,
  writeUiUploadDraft,
} from "@/lib/ui-upload-draft";

const CATEGORY_OPTIONS = [
  "Furniture & Fixtures",
  "Lighting",
  "HVAC / Temperature",
  "Electrical / Outlets",
  "Restrooms",
  "WiFi / Tech",
  "Free Food / Events",
  "Announcements",
  "Pop-up / Activities",
];

function toNowString(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function TriageFormPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [issueSelected, setIssueSelected] = useState(true);
  const [announcementSelected, setAnnouncementSelected] = useState(true);
  const [building, setBuilding] = useState("PCL Library");
  const [floor, setFloor] = useState("3rd Floor");
  const [pin, setPin] = useState({ x: 50, y: 50 });
  const [uploadDraft, setUploadDraft] = useState<UiUploadDraft>();

  const flagCount = Number(issueSelected) + Number(announcementSelected);
  const submitLabel = `${flagCount} flag${flagCount === 1 ? "" : "s"}`;

  function onMapPointer(
    event:
      | React.PointerEvent<HTMLDivElement>
      | React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) {
    if (!mapRef.current) {
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width) * 100;
    const nextY = ((event.clientY - rect.top) / rect.height) * 100;
    setPin({
      x: Math.max(4, Math.min(96, nextX)),
      y: Math.max(6, Math.min(96, nextY)),
    });
  }

  const detectedText = useMemo(
    () => `AI detected: Broken chair - ${building}`,
    [building],
  );
  const fileLabel = useMemo(() => {
    if (!uploadDraft) {
      return "IMG_3847.jpg - 2.4MB";
    }
    const sizeMb = (uploadDraft.fileSizeBytes / (1024 * 1024)).toFixed(1);
    return `${uploadDraft.fileName} - ${sizeMb}MB`;
  }, [uploadDraft]);

  useEffect(() => {
    setUploadDraft(readUiUploadDraft());
  }, []);

  function openReplacePhotoPicker() {
    replaceInputRef.current?.click();
  }

  async function onReplacePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const previewDataUrl = await fileToDataUrl(file);
      const nextDraft: UiUploadDraft = {
        previewDataUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType: file.type,
        selectedAt: new Date().toISOString(),
      };
      writeUiUploadDraft(nextDraft);
      setUploadDraft(nextDraft);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-ut-cream px-6 pb-28">
      <div className="mx-auto max-w-[620px]">
        <div className="sticky top-0 z-20 mb-8 flex items-center justify-between bg-ut-cream/95 py-4 backdrop-blur">
          <Link href="/landing" className="text-sm font-semibold text-ut-mid hover:text-ut-burnt">
            ← Back
          </Link>
          <div className="font-display text-lg font-black text-ut-charcoal">
            Bevo<span className="text-ut-burnt">Fix</span>
          </div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[2px] text-ut-mid">
            Step 2 of 2
          </span>
        </div>

        <div className="mb-6 overflow-hidden rounded-ut bg-ut-white shadow-utMd">
          <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-[#2D2520] to-[#4A3525]">
            {uploadDraft ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uploadDraft.previewDataUrl}
                alt="Uploaded preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-6xl opacity-30">🖼️</span>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-ut-charcoal/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-white">
              <span className="h-2 w-2 animate-pulseDot rounded-full bg-[#6EE7A0]" />
              AI analyzing...
            </div>
            <button
              type="button"
              onClick={openReplacePhotoPicker}
              className="absolute right-4 top-4 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
            >
              Change photo
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-mono text-xs text-ut-mid">{fileLabel}</span>
            <span className="text-xs font-semibold text-ut-burnt">✦ Fields auto-filled</span>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-utSm border border-ut-burnt/20 bg-gradient-to-br from-[#FFF5EE] to-[#FFEEDD] px-5 py-4">
          <span className="text-xl">✦</span>
          <div>
            <h2 className="text-sm font-bold text-ut-burnt">{detectedText}</h2>
            <p className="text-xs leading-5 text-ut-brown">
              We pre-filled the fields below. Review and edit anything before posting.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-ut bg-ut-white p-6 shadow-utSm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-ut-mid">
              Title <span className="rounded-full bg-[#FFF0E6] px-2 py-0.5 text-[9px] text-ut-burnt">AI filled</span>
            </p>
            <input
              defaultValue="Broken chair leg in PCL 3rd floor study area"
              className="w-full border-none bg-transparent text-base font-medium text-ut-charcoal outline-none"
            />
          </section>

          <section className="rounded-ut bg-ut-white p-6 shadow-utSm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-ut-mid">Description</p>
            <textarea
              rows={3}
              defaultValue="Chair leg is cracked and poses a fall risk. Right side, near the window row. About 3 chairs affected."
              className="w-full resize-none border-none bg-transparent text-base font-medium leading-6 text-ut-charcoal outline-none"
            />
          </section>

          <section className="rounded-ut bg-ut-white p-6 shadow-utSm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-ut-mid">
              Category <span className="rounded-full bg-[#FFF0E6] px-2 py-0.5 text-[9px] text-ut-burnt">AI filled</span>
            </p>
            <select className="w-full appearance-none border-none bg-transparent text-base font-medium text-ut-charcoal outline-none">
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </section>

          <section className="rounded-ut bg-ut-white p-6 shadow-utSm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-ut-mid">
              Time of incident
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-medium text-ut-charcoal">Now - {toNowString()}</span>
              <button className="rounded-lg bg-[#FFF0E6] px-2 py-1 text-xs font-semibold text-ut-burnt">
                Change
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-ut bg-ut-white shadow-utSm">
            <div
              ref={mapRef}
              className="map-grid-fine relative h-44 cursor-crosshair bg-gradient-to-br from-[#C8E0C8] via-[#B0D0B8] to-[#A8CCA8]"
              onPointerDown={onMapPointer}
              onPointerMove={(event) => {
                if ((event.buttons & 1) === 1) {
                  onMapPointer(event);
                }
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-3.5 -translate-y-1/2 bg-white/70" />
              <div className="absolute inset-y-0 left-[35%] w-2.5 bg-white/60" />
              <div
                className="absolute z-10 -translate-x-1/2 -translate-y-full"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <div className="flex h-8 w-8 rotate-[-45deg] items-center justify-center rounded-[50%_50%_50%_0] bg-ut-burnt shadow-[0_4px_12px_rgba(192,80,26,0.5)]">
                  <div className="h-3 w-3 rotate-45 rounded-full bg-white" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-ut-mid">
                © OpenStreetMap
              </div>
            </div>

            <div className="p-6">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-ut-mid">
                Location <span className="rounded-full bg-[#FFF0E6] px-2 py-0.5 text-[9px] text-ut-burnt">AI filled</span>
              </p>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-ut-cream p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[1.5px] text-ut-mid">
                    Building
                  </p>
                  <input
                    value={building}
                    onChange={(event) => setBuilding(event.target.value)}
                    className="w-full border-none bg-transparent text-sm font-medium text-ut-charcoal outline-none"
                  />
                </div>
                <div className="rounded-xl bg-ut-cream p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[1.5px] text-ut-mid">
                    Floor / Room
                  </p>
                  <input
                    value={floor}
                    onChange={(event) => setFloor(event.target.value)}
                    className="w-full border-none bg-transparent text-sm font-medium text-ut-charcoal outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-ut bg-ut-white p-6 shadow-utSm">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[2.5px] text-ut-mid">
              Flag this post as...
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIssueSelected((value) => !value)}
                className={`rounded-utSm border-2 p-4 text-left transition ${
                  issueSelected
                    ? "border-ut-burnt bg-[#FFF8F4]"
                    : "border-ut-faint bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xl">🔧</span>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      issueSelected ? "bg-ut-burnt text-white" : "bg-ut-faint text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
                <p className="text-sm font-bold text-ut-charcoal">Issue</p>
                <p className="mt-1 text-xs leading-5 text-ut-mid">
                  Report to campus services with urgency triage.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAnnouncementSelected((value) => !value)}
                className={`rounded-utSm border-2 p-4 text-left transition ${
                  announcementSelected
                    ? "border-ut-blue bg-[#F4F7FF]"
                    : "border-ut-faint bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xl">📢</span>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      announcementSelected
                        ? "bg-ut-blue text-white"
                        : "bg-ut-faint text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
                <p className="text-sm font-bold text-ut-charcoal">Announcement</p>
                <p className="mt-1 text-xs leading-5 text-ut-mid">
                  Publish in the campus community feed.
                </p>
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center bg-gradient-to-t from-ut-cream via-ut-cream/90 to-transparent px-6 py-4">
        <Link
          href="/feed"
          className="flex w-full max-w-[540px] items-center justify-center gap-2 rounded-full bg-ut-burnt px-8 py-4 text-base font-bold text-white shadow-[0_8px_32px_rgba(192,80,26,0.4)] transition hover:bg-ut-burntHover"
        >
          Post to BevoFix
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">{submitLabel}</span>
          →
        </Link>
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onReplacePhoto}
      />
    </div>
  );
}
