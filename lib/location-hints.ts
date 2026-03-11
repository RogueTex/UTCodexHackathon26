export type PhotoMetadata = {
  latitude: number;
  longitude: number;
  capturedAt?: string;
  source: "exif" | "seeded-demo";
};

export type LocationHint = {
  latitude: number;
  longitude: number;
  label: string;
  source: PhotoMetadata["source"];
  precision: "landmark" | "campus-area" | "coordinates";
  openStreetMapEmbedUrl: string;
  openStreetMapLinkUrl: string;
};

type CampusLandmark = {
  label: string;
  latitude: number;
  longitude: number;
};

const CAMPUS_CENTER = {
  latitude: 30.2849,
  longitude: -97.7369,
};

const CAMPUS_LANDMARKS: CampusLandmark[] = [
  { label: "PCL study area", latitude: 30.28282, longitude: -97.73812 },
  { label: "Texas Union", latitude: 30.28605, longitude: -97.74142 },
  { label: "Welch Hall", latitude: 30.28861, longitude: -97.73579 },
  { label: "Gregory Gym", latitude: 30.28491, longitude: -97.73683 },
  { label: "Main Mall", latitude: 30.28623, longitude: -97.73935 },
  { label: "Jester Residence Hall", latitude: 30.28373, longitude: -97.73636 },
];

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildOpenStreetMapUrls(latitude: number, longitude: number) {
  const latDelta = 0.0028;
  const lngDelta = 0.0036;
  const bbox = [
    longitude - lngDelta,
    latitude - latDelta,
    longitude + lngDelta,
    latitude + latDelta,
  ]
    .map((value) => value.toFixed(6))
    .join("%2C");
  const marker = `${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;

  return {
    openStreetMapEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`,
    openStreetMapLinkUrl: `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=17/${latitude.toFixed(6)}/${longitude.toFixed(6)}`,
  };
}

function inferCampusLabel(latitude: number, longitude: number) {
  let closest: { label: string; distance: number } | null = null;

  for (const landmark of CAMPUS_LANDMARKS) {
    const distance = distanceMeters(
      latitude,
      longitude,
      landmark.latitude,
      landmark.longitude,
    );

    if (!closest || distance < closest.distance) {
      closest = { label: landmark.label, distance };
    }
  }

  if (closest && closest.distance <= 220) {
    return { label: closest.label, precision: "landmark" as const };
  }

  const campusDistance = distanceMeters(
    latitude,
    longitude,
    CAMPUS_CENTER.latitude,
    CAMPUS_CENTER.longitude,
  );
  if (campusDistance <= 1200) {
    return { label: "UT Austin campus area", precision: "campus-area" as const };
  }

  return {
    label: `Coordinates ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    precision: "coordinates" as const,
  };
}

export function buildLocationHint(
  photoMetadata: PhotoMetadata | undefined,
): LocationHint | undefined {
  if (!photoMetadata) {
    return undefined;
  }

  const location = inferCampusLabel(
    photoMetadata.latitude,
    photoMetadata.longitude,
  );

  return {
    latitude: photoMetadata.latitude,
    longitude: photoMetadata.longitude,
    label: location.label,
    source: photoMetadata.source,
    precision: location.precision,
    ...buildOpenStreetMapUrls(photoMetadata.latitude, photoMetadata.longitude),
  };
}

export function prefersMetadataLocation(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "needs confirmation" ||
    normalized === "unknown" ||
    normalized === "unclear"
  );
}
