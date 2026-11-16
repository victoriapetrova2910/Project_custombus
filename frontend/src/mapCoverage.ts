import type { MultiPolygon, Polygon, Position } from "geojson";

import boundariesJson from "../../data/zones_boundaries.json?raw";
import tinaoJson from "../../data/tinao_service_boundary.json?raw";

type Boundary = { geometry: Polygon | MultiPolygon };
const boundaries = JSON.parse(boundariesJson) as Record<"nao" | "tao" | "skolkovo", Boundary>;
export const referenceAreas = [boundaries.nao, boundaries.tao];
export const coverage = {
  nao: JSON.parse(tinaoJson) as Boundary,
  skolkovo: boundaries.skolkovo,
};

function pointInRing(ring: Position[], longitude: number, latitude: number) {
  let inside = false;
  for (let i = 0, previous = ring.length - 1; i < ring.length; previous = i++) {
    const [x, y] = ring[i];
    const [lastX, lastY] = ring[previous];
    if ((y > latitude) === (lastY > latitude)) continue;
    const intersection = x + (lastX - x) * (latitude - y) / (lastY - y);
    if (longitude < intersection) inside = !inside;
  }
  return inside;
}

export function isWithinCoverage(longitude: number, latitude: number) {
  return [coverage.nao, coverage.skolkovo].some(({ geometry }) => {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    return polygons.some(([outline, ...holes]) =>
      pointInRing(outline, longitude, latitude) &&
      !holes.some((hole) => pointInRing(hole, longitude, latitude)),
    );
  });
}

export function isPointWithinCoverage(point: { longitude: number; latitude: number }) {
  return isWithinCoverage(point.longitude, point.latitude);
}
