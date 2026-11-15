const PHOTON_REVERSE = import.meta.env.VITE_PHOTON_REVERSE_URL || "https://photon.komoot.io/reverse";

type Address = {
  street?: string;
  housenumber?: string;
  name?: string;
  locality?: string;
  city?: string;
  type?: string;
};

export async function lookupMapAddress(latitude: number, longitude: number, signal: AbortSignal) {
  const url = new URL(PHOTON_REVERSE);
  url.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    radius: "0.2",
    limit: "5",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
  });
  if (!response.ok) return "";

  const { features } = await response.json() as { features: { properties: Address }[] };
  const addresses = features.map(({ properties }) => properties);
  const address = addresses.find((item) => item.street && item.housenumber)
    ?? addresses.find((item) => item.street || item.type === "street");
  if (!address) return "";

  const street = address.street ?? address.name;
  return [...new Set([street, address.housenumber, address.locality ?? address.city].filter(Boolean))].join(", ");
}

export async function findMapAddress(query: string, latitude: number, longitude: number, signal: AbortSignal) {
  const url = new URL(import.meta.env.VITE_PHOTON_SEARCH_URL || "https://photon.komoot.io/api/");
  url.search = new URLSearchParams({
    q: query, lat: String(latitude), lon: String(longitude), limit: "5",
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
  });
  if (!response.ok) throw new Error("Поиск адреса недоступен.");

  const { features } = await response.json() as {
    features: { geometry: { coordinates: [number, number] }; properties: Address }[];
  };
  return features.map(({ geometry, properties }) => ({
    longitude: geometry.coordinates[0],
    latitude: geometry.coordinates[1],
    label: [...new Set([properties.street ?? properties.name, properties.housenumber, properties.locality ?? properties.city].filter(Boolean))].join(", ") || query,
  }));
}
