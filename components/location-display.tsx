import { AssistantLocation } from "@/lib/types";

type Props = {
  location: AssistantLocation;
  showMap?: boolean;
  compact?: boolean;
};

function sourceLabel(source: AssistantLocation["source"]): string {
  if (source === "metadata") {
    return "Metadata";
  }
  if (source === "manual") {
    return "Manual edit";
  }
  return "Inferred";
}

export function LocationDisplay({
  location,
  showMap = false,
  compact = false,
}: Props) {
  const hasCoordinates =
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    Boolean(location.openStreetMapEmbedUrl);

  return (
    <div className={`location-card ${compact ? "compact" : ""}`}>
      <div className="location-head">
        <span className="location-pin" aria-hidden="true" />
        <div>
          <p className="location-label">Location</p>
          <strong>{location.text}</strong>
        </div>
      </div>

      <div className="chip-row">
        <span className="chip">{sourceLabel(location.source)}</span>
        <span className="chip">{location.confidence}</span>
        {typeof location.latitude === "number" && typeof location.longitude === "number" ? (
          <span className="chip">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </span>
        ) : null}
      </div>

      {showMap ? (
        hasCoordinates ? (
          <div className="mini-map-card">
            <iframe
              title="Location preview"
              src={location.openStreetMapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="mini-map-placeholder">
            <strong>Mini-map unavailable</strong>
            <p>BevoFix keeps the location honest when exact coordinates are not available.</p>
          </div>
        )
      ) : null}
    </div>
  );
}
