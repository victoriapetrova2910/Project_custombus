import type { LineString } from "geojson";

const ROUTE_API = import.meta.env.VITE_DRIVING_ROUTE_API ||
  "https://routing.openstreetmap.de/routed-car/route/v1/driving/";

export const AVERAGE_BUS_SPEED_KMH = 25;
const distanceFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export function formatRoadDistance(meters: number) {
  return meters < 1000
    ? distanceFormat.format(Math.round(meters)) + " м"
    : distanceFormat.format(meters / 1000) + " км";
}

export type DrivingResult =
  | { state: "found"; minutes: number; distanceMeters: number; geometry?: LineString }
  | { state: "empty" | "error" };

export async function getDrivingRoute(routeKey: string, signal: AbortSignal): Promise<DrivingResult> {
  const points = routeKey.split(";").map((point) => point.split(",").map(Number));
  if (points.length !== 2 || points.some(([lat, lon], i) =>
    points[i].length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lon) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180
  )) return { state: "error" };

  const coordinates = points.map(([lat, lon]) => lon.toFixed(6) + "," + lat.toFixed(6)).join(";");
  try {
    const response = await fetch(ROUTE_API + coordinates + "?overview=full&geometries=geojson", {
      signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]),
    });
    const data = await response.json() as { code?: string; routes?: { distance: number; geometry?: LineString }[] };
    if (data.code === "NoRoute" || data.code === "NoSegment") return { state: "empty" };
    if (!response.ok) return { state: "error" };
    const route = data.routes?.[0];
    const distanceMeters = route?.distance;
    const geometry = route?.geometry?.type === "LineString" && route.geometry.coordinates.length >= 2
      ? route.geometry : undefined;
    if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return { state: "error" };
    }
    const minutes = Math.max(1, Math.round(distanceMeters / 1000 / AVERAGE_BUS_SPEED_KMH * 60));
    return { state: "found", minutes, distanceMeters, geometry };
  } catch {
    return { state: "error" };
  }
}
