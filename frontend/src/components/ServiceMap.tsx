import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { FeatureCollection, LineString, Point } from "geojson";
import { LngLat, LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource, type MapMouseEvent } from "maplibre-gl";

import { coverage, isWithinCoverage } from "../mapCoverage";
import { lookupMapAddress } from "../api/mapAddress";
import { getTripRoute, listMapStops, listServiceStops, type ServiceStop, type StopShort, type TripRoute } from "../api/trips";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import StopDirectory from "./StopDirectory";

setWorkerUrl(workerUrl);

const DETAIL_ZOOM = 14;
const NEARBY_STOP_RADIUS_METERS = 1000;
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const AREAS = {
  nao: { label: "ТиНАО", color: "#087a59", center: [37.414, 55.527], zoom: 10.9 },
  skolkovo: { label: "Сколково", color: "#8242a6", center: [37.35, 55.70], zoom: 12.5 },
} satisfies Record<string, { label: string; color: string; center: [number, number]; zoom: number }>;

export type MapPoint = {
  latitude: number;
  longitude: number;
  label: string;
  isAddress: boolean;
  stopId?: number;
};
export type MapPicker = {
  field: "from" | "to";
  showDirectory?: boolean;
  onSelect: (point: MapPoint) => void;
};

type JourneyPoint = Pick<MapPoint, "latitude" | "longitude" | "label">;
type MapJourney = { start: JourneyPoint; end: JourneyPoint; geometry?: LineString };

type AreaId = keyof typeof AREAS;
type RouteResult = { route: TripRoute; stops: StopShort[]; error?: string };

const areaIds = Object.keys(AREAS) as AreaId[];
type PickDraft = {
  picker: MapPicker;
  point?: MapPoint;
  resolving?: boolean;
  error?: string;
};
const zones: FeatureCollection = {
  type: "FeatureCollection",
  features: areaIds.map((id) => ({
    type: "Feature",
    geometry: coverage[id].geometry,
    properties: { color: AREAS[id].color },
  })),
};
const empty: FeatureCollection = { type: "FeatureCollection", features: [] };

function fitArea(map: MapLibreMap, id: AreaId, duration: number) {
  const { geometry } = coverage[id];
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const bounds = new LngLatBounds();
  for (const [outline] of polygons) {
    for (const [longitude, latitude] of outline) bounds.extend([longitude, latitude]);
  }
  const canvas = map.getContainer();
  const padding = canvas.clientWidth >= 860
    ? { left: 448, right: 48, top: 116, bottom: 48 }
    : { left: 36, right: 36, top: 160, bottom: Math.round(canvas.clientHeight * 0.32) };
  map.fitBounds(bounds, { padding, maxZoom: 13, duration });
}

function coordinate(stop: Pick<MapPoint, "latitude" | "longitude">): [number, number] {
  return [stop.longitude, stop.latitude];
}

function mapPoints(stops: StopShort[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: stops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: coordinate(stop) },
      properties: { id: stop.id, name: stop.name },
    })),
  };
}

function addMapLayers(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type === "symbol" && "source-layer" in layer && layer["source-layer"] === "poi") {
      const transit: ExpressionSpecification = ["any", ["==", ["get", "class"], "bus"], ["in", ["get", "subclass"], ["literal", ["bus_stop", "tram_stop", "platform"]]]];
      const current = map.getFilter(layer.id) as ExpressionSpecification | boolean | undefined;
      map.setFilter(layer.id, current ? ["all", current, ["!", transit]] : ["!", transit]);
    }
  }

  map.addSource("areas", { type: "geojson", data: zones });
  map.addLayer({
    id: "area-fill", type: "fill", source: "areas",
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.16 },
  });
  map.addLayer({
    id: "area-outline", type: "line", source: "areas",
    paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.85 },
  });

  map.addSource("driving-route", { type: "geojson", data: empty });
  for (const [id, color, width] of [
    ["driving-outline", "#fff", 9],
    ["driving-line", "#285db6", 5],
  ] as const) {
    map.addLayer({
      id, type: "line", source: "driving-route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": color, "line-width": width },
    });
  }

  map.addSource("trip-route", { type: "geojson", data: empty });
  map.addLayer({
    id: "trip-line", type: "line", source: "trip-route",
    filter: ["==", ["geometry-type"], "LineString"],
    paint: { "line-color": "#172a80", "line-width": 4, "line-dasharray": [2, 1] },
  });
  map.addLayer({
    id: "trip-stops", type: "circle", source: "trip-route",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": ["match", ["get", "role"], "start", "#087a59", "end", "#b72e3b", "#172a80"],
      "circle-radius": ["match", ["get", "role"], "middle", 5, 8],
      "circle-stroke-color": "#ffffff", "circle-stroke-width": 2,
    },
  });
}

function routeFeatures(stops: StopShort[]): FeatureCollection<LineString | Point> {
  const points = mapPoints(stops).features;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: stops.map(coordinate) },
      },
      ...points.map((point, index) => ({
        ...point,
        properties: {
          ...point.properties,
          role: index === 0 ? "start" : index === points.length - 1 ? "end" : "middle",
        },
      })),
    ],
  };
}

export default function ServiceMap({
  route, journey, picker, onCancelPick,
}: {
  route?: TripRoute;
  journey?: MapJourney;
  picker?: MapPicker;
  onCancelPick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [area, setArea] = useState<AreaId>("nao");
  const [ready, setReady] = useState(false);
  const [stops, setStops] = useState<StopShort[]>([]);
  const [catalog, setCatalog] = useState<ServiceStop[]>([]);
  const [view, setView] = useState<{ center: ReturnType<MapLibreMap["getCenter"]>; zoom: number }>();
  const serviceStopIds = useMemo(() => new Set(stops.map((stop) => stop.id)), [stops]);
  const nearbyStops = useMemo(() => {
    if (!view || view.zoom < DETAIL_ZOOM) return [];
    return catalog.filter((stop) =>
      !serviceStopIds.has(stop.id) &&
      view.center.distanceTo(LngLat.convert(coordinate(stop))) <= NEARBY_STOP_RADIUS_METERS,
    );
  }, [catalog, view, serviceStopIds]);
  const [draft, setDraft] = useState<PickDraft>();
  const activeDraft = picker && draft?.picker === picker ? draft : undefined;
  const pickedPoint = activeDraft?.point;
  const addressRequest = useRef<AbortController>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);


  useEffect(() => {
    if (picker) cancelButton.current?.focus({ preventScroll: true });
  }, [picker]);

  useEffect(() => () => addressRequest.current?.abort(), [picker]);

  const pickPoint = useEffectEvent((event: MapMouseEvent) => {
    if (!picker) return false;

    addressRequest.current?.abort();

    const { lat: latitude, lng: longitude } = event.lngLat.wrap();
    if (!isWithinCoverage(longitude, latitude)) {
      setDraft({ picker, error: "Здесь сервис не работает. Выберите точку в выделенной зоне." });
      return true;
    }

    const point = { latitude, longitude, label: "", isAddress: true };
    const controller = new AbortController();
    addressRequest.current = controller;
    setDraft({ picker, point, resolving: true });
    void lookupMapAddress(latitude, longitude, controller.signal)
      .catch(() => "")
      .then((label) => {
        if (controller.signal.aborted) return;
        setDraft({
          picker,
          point: { ...point, label },
          error: label ? undefined : "Адрес не найден. Укажите его вручную или поставьте метку ближе к зданию.",
        });
      });
    return true;
  });
  const [stopsError, setStopsError] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult>();
  const result = route && routeResult?.route === route ? routeResult : undefined;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current, style: MAP_STYLE,
      center: AREAS.nao.center, zoom: AREAS.nao.zoom,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.once("load", () => {
      addMapLayers(map);
      fitArea(map, "nao", 0);
      const updateView = () => setView({ center: map.getCenter(), zoom: map.getZoom() });
      map.on("moveend", updateView);
      updateView();
      const popup = new Popup({ closeButton: false });
      map.on("mouseenter", "trip-stops", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "trip-stops", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", (event) => {
        if (pickPoint(event)) {
          popup.remove();
          return;
        }
        const [stop] = map.queryRenderedFeatures(event.point, { layers: ["trip-stops"] });
        if (typeof stop?.properties.name === "string") {
          popup.setLngLat(event.lngLat).setText(stop.properties.name).addTo(map);
        }
      });
      setReady(true);
    });
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listMapStops(controller.signal).then(
      (items) => { if (!controller.signal.aborted) setStops(items); },
      () => { if (!controller.signal.aborted) setStopsError(true); },
    );
    return () => controller.abort();
  }, []);

  const showNearbyStops = Boolean(view && view.zoom >= DETAIL_ZOOM);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  useEffect(() => {
    if ((!showNearbyStops && !picker) || catalogLoaded) return;
    const controller = new AbortController();
    listServiceStops(controller.signal).then(
      (items) => {
        if (controller.signal.aborted) return;
        setCatalog(items);
        setCatalogLoaded(true);
        setCatalogError(false);
      },
      () => { if (!controller.signal.aborted) setCatalogError(true); },
    );
    return () => controller.abort();
  }, [showNearbyStops, picker, catalogLoaded]);

  const selectStop = useEffectEvent((map: MapLibreMap, stop: StopShort, popup: Popup, selectable: boolean) => {
    if (!selectable) {
      if (picker) {
        addressRequest.current?.abort();
        setDraft({ picker, error: "Эта остановка справочная. Выберите зелёную метку или адрес в зоне сервиса." });
        return;
      }
      popup.setLngLat(coordinate(stop)).setText(stop.name + " · справочная остановка").addTo(map);
      return;
    }
    if (!picker) {
      popup.setLngLat(coordinate(stop)).setText(stop.name).addTo(map);
      return;
    }

    popup.remove();
    addressRequest.current?.abort();
    const { id: stopId, name: label, latitude, longitude } = stop;
    setDraft({ picker, point: { stopId, label, latitude, longitude, isAddress: false } });
  });

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const popup = new Popup({ closeButton: false });

    const shownStops = [...stops, ...nearbyStops];
    const markers = shownStops.map((stop) => {
      const selectable = serviceStopIds.has(stop.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = selectable ? "service-stop-marker" : "service-stop-marker service-stop-marker--reference";
      button.setAttribute("aria-label", (selectable ? "Остановка " : "Справочная остановка ") + stop.name);
      button.title = stop.name;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        selectStop(map, stop, popup, selectable);
      });

      return new Marker({ element: button }).setLngLat(coordinate(stop)).addTo(map);
    });
    return () => {
      popup.remove();
      for (const marker of markers) marker.remove();
    };
  }, [ready, stops, nearbyStops, serviceStopIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !journey) return;

    const { start, end, geometry } = journey;
    const source = map.getSource<GeoJSONSource>("driving-route");
    source?.setData(geometry ? { type: "Feature", properties: {}, geometry } : empty);
    const bounds = new LngLatBounds(coordinate(start), coordinate(end));
    for (const [longitude, latitude] of geometry?.coordinates ?? []) bounds.extend([longitude, latitude]);
    const markers = ([["Откуда", start], ["Куда", end]] as const).map(([label, point]) => {
      const element = document.createElement("span");
      element.className = "journey-map-pin";
      element.dataset.point = label === "Откуда" ? "start" : "end";
      element.textContent = element.dataset.point === "start" ? "А" : "В";
      element.title = point.label;
      element.setAttribute("aria-label", label + ": " + point.label);
      return new Marker({ element, anchor: "bottom" }).setLngLat(coordinate(point)).addTo(map);
    });
    const canvas = map.getContainer();
    const padding = canvas.clientWidth >= 860
      ? { top: 150, bottom: 62, left: 468, right: 66 }
      : { top: 155, bottom: Math.round(canvas.clientHeight * 0.61), left: 38, right: 38 };
    if (padding.top + padding.bottom >= canvas.clientHeight - 40) {
      padding.top = Math.round(canvas.clientHeight * 0.22);
      padding.bottom = Math.round(canvas.clientHeight * 0.50);
    }
    map.fitBounds(bounds, { padding, maxZoom: 15, duration: 550 });
    return () => {
      source?.setData(empty);
      for (const marker of markers) marker.remove();
    };
  }, [ready, journey]);

  useEffect(() => {
    if (!route) return;
    const controller = new AbortController();
    getTripRoute(route, controller.signal).then(
      (items) => { if (!controller.signal.aborted) setRouteResult({ route, stops: items }); },
      () => {
        if (!controller.signal.aborted) {
          setRouteResult({ route, stops: [], error: "Не удалось показать схему рейса." });
        }
      },
    );
    return () => controller.abort();
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const routeStops = result?.stops ?? [];
    map.getSource<GeoJSONSource>("trip-route")?.setData(routeStops.length ? routeFeatures(routeStops) : empty);
    if (!routeStops.length) return;
    const bounds = new LngLatBounds();
    for (const stop of routeStops) bounds.extend(coordinate(stop));
    const canvas = map.getContainer();
    const padding = canvas.clientWidth >= 860
      ? { top: 125, bottom: 62, left: 448, right: 48 }
      : { top: 160, bottom: Math.round(canvas.clientHeight * 0.32), left: 38, right: 38 };
    map.fitBounds(bounds, { padding, maxZoom: 15, duration: 650 });
  }, [ready, result]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !pickedPoint) return;

    const marker = new Marker({ color: "#2765b3" })
      .setLngLat([pickedPoint.longitude, pickedPoint.latitude])
      .addTo(map);
    return () => { marker.remove(); };
  }, [ready, pickedPoint]);

  function focusDirectoryPoint(point: JourneyPoint, stopId?: number) {
    const map = mapRef.current;
    if (!picker || !map) return;
    addressRequest.current?.abort();
    map.easeTo({ center: coordinate(point), zoom: Math.max(16, map.getZoom()), duration: 450 });
    if (stopId && serviceStopIds.has(stopId)) {
      setDraft({ picker, point: { ...point, stopId, isAddress: false } });
    } else if (isWithinCoverage(point.longitude, point.latitude)) {
      setDraft({ picker, point: { ...point, isAddress: true } });
    } else {
      setDraft({ picker, error: "Здесь сервис не работает. Выберите точку в выделенной зоне." });
    }
  }

  function confirmPoint() {
    if (!picker || !pickedPoint || !pickedPoint.label.trim()) return;
    if (pickedPoint.isAddress && !isWithinCoverage(pickedPoint.longitude, pickedPoint.latitude)) return;
    if (!pickedPoint.isAddress && !serviceStopIds.has(pickedPoint.stopId ?? 0)) return;
    picker.onSelect({ ...pickedPoint, label: pickedPoint.label.trim() });
  }

  function changeArea(nextArea: AreaId) {
    setArea(nextArea);
    const map = mapRef.current;
    if (map) fitArea(map, nextArea, 650);
  }

  return (
    <div className="service-map">
      <div ref={containerRef} className={picker ? "service-map__canvas service-map__canvas--picking" : "service-map__canvas"} aria-label="Карта сервиса «По пути»" />
      <div className="map-area-switch" role="group" aria-label="Зоны обслуживания">
        {areaIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => changeArea(id)}
            className={area === id ? "active" : ""}
            aria-pressed={area === id}
          >
            <span className="map-area-swatch" style={{ backgroundColor: AREAS[id].color }} />
            {AREAS[id].label}
          </button>
        ))}
      </div>
      {picker && (
        <div className="map-picker" aria-label="Выбор точки на карте">
          <div className="map-picker__actions">
            <strong>{picker.field === "from" ? "Точка отправления" : "Точка назначения"}</strong>
            <button ref={cancelButton} type="button" onClick={onCancelPick}>Отмена</button>
          </div>
          {!pickedPoint && !activeDraft?.error && (
            <p role="status">{!ready ? "Загружаем карту…" : "Выберите остановку или адрес в выделенной зоне."}</p>
          )}
          {ready && (
            <StopDirectory
              key={picker.field}
              openInitially={picker.showDirectory}
              stops={catalog}
              loaded={catalogLoaded}
              failed={catalogError}
              center={{ latitude: view?.center.lat ?? AREAS[area].center[1], longitude: view?.center.lng ?? AREAS[area].center[0] }}
              onLocate={focusDirectoryPoint}
            />
          )}
          {activeDraft?.error && <p role="alert">{activeDraft.error}</p>}
          {pickedPoint?.isAddress && (
            <>
              <label>
                Адрес или ориентир
                <input
                  value={pickedPoint.label}
                  placeholder={activeDraft?.resolving ? "Ищем адрес…" : "Улица и номер дома"}
                  disabled={activeDraft?.resolving}
                  onChange={(event) => setDraft({
                    picker, point: { ...pickedPoint, label: event.target.value },
                  })}
                />
              </label>
              <p className="map-picker__notice" role="status">При выборе адреса возможны незначительные задержки.</p>
            </>
          )}
          {pickedPoint && !pickedPoint.isAddress && <p>{pickedPoint.label}</p>}
          {pickedPoint && (
            <button
              type="button"
              className="map-picker__confirm"
              onClick={confirmPoint}
              disabled={activeDraft?.resolving || !pickedPoint.label.trim()}
            >
              Готово
            </button>
          )}
        </div>
      )}
      <div className="map-label" role="status" hidden={Boolean(picker || journey)}>
        <span><i className="map-label__dot" />{stopsError ? "Остановки недоступны" : "Остановки «По пути»"}</span>
        {!route && (
          <span>{showNearbyStops
            ? catalogError ? "Не удалось загрузить справочные остановки" : "Серые метки · до 1 км от центра карты"
            : "Приблизьте карту, чтобы увидеть другие остановки"}</span>
        )}
        {route && (
          <span><i className="map-label__line" />
            {result?.error ?? (result ? `Схема рейса №${route.tripId} по остановкам` : "Загружаем схему рейса…")}
          </span>
        )}
      </div>
    </div>
  );
}
