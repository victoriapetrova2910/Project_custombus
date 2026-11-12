
import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";

import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(workerUrl);

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";

type AreaId = "kommunarka" | "troitsk" | "skolkovo";

const AREAS: Record<
  AreaId,
  { label: string; center: [number, number]; zoom: number }
> = {
  kommunarka: {
    label: "Коммунарка",
    center: [37.47, 55.56],
    zoom: 11.5,
  },
  troitsk: {
    label: "Троицк",
    center: [37.30, 55.49],
    zoom: 12,
  },
  skolkovo: {
    label: "Сколково",
    center: [37.35, 55.70],
    zoom: 12.5,
  },
};

export default function ServiceMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [area, setArea] = useState<AreaId>("kommunarka");

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: AREAS.kommunarka.center,
      zoom: AREAS.kommunarka.zoom,
    });

    map.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right"
    );

    mapRef.current = map;

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  function changeArea(nextArea: AreaId) {
    setArea(nextArea);

    const selected = AREAS[nextArea];

    mapRef.current?.flyTo({
      center: selected.center,
      zoom: selected.zoom,
      duration: 900,
      essential: true,
    });
  }

  return (
    <div className="service-map">
      <div
        ref={containerRef}
        className="service-map__canvas"
      />

      <div className="map-area-switch">
        {(Object.keys(AREAS) as AreaId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => changeArea(id)}
            className={area === id ? "active" : ""}
            aria-pressed={area === id}
          >
            {AREAS[id].label}
          </button>
        ))}
      </div>

      <div className="map-label">
        <span className="map-label__dot" />
        Территории обслуживания «По пути»
      </div>
    </div>
  );
}
