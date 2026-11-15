import { useEffect, useRef, useState } from "react";
import { findMapAddress } from "../api/mapAddress";
import type { ServiceStop } from "../api/trips";
import { isWithinCoverage } from "../mapCoverage";

type Coordinates = { latitude: number; longitude: number };
type AddressPoint = Coordinates & { label: string };
const pageSize = 30;

function distanceSquared(point: Coordinates, origin: Coordinates) {
  const longitudeScale = Math.cos(origin.latitude * Math.PI / 180);
  return (point.latitude - origin.latitude) ** 2 +
    ((point.longitude - origin.longitude) * longitudeScale) ** 2;
}

export default function StopDirectory({
  openInitially, stops, loaded, failed, center, onLocate,
}: {
  openInitially?: boolean;
  stops: ServiceStop[];
  loaded: boolean;
  failed: boolean;
  center: Coordinates;
  onLocate: (point: AddressPoint, stopId?: number) => void;
}) {
  const [open, setOpen] = useState(openInitially ?? false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(pageSize);
  const [addresses, setAddresses] = useState<AddressPoint[]>([]);
  const [nearAddress, setNearAddress] = useState<AddressPoint>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const phrase = query.trim().toLocaleLowerCase("ru");
  const visibleStops = !open ? [] : nearAddress
    ? [...stops].sort((left, right) => distanceSquared(left, nearAddress) - distanceSquared(right, nearAddress))
    : stops.filter((stop) => [stop.name, stop.zone, stop.stop_code].some((value) =>
        value?.toLocaleLowerCase("ru").includes(phrase)
      ));

  function editQuery(value: string) {
    requestRef.current?.abort();
    setPending(false);
    setQuery(value);
    setLimit(pageSize);
    setAddresses([]);
    setNearAddress(undefined);
    setError("");
  }

  async function searchAddress() {
    if (!query.trim()) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError("");
    setAddresses([]);
    setNearAddress(undefined);
    try {
      const locations = await findMapAddress(query.trim(), center.latitude, center.longitude, controller.signal);
      if (controller.signal.aborted) return;
      const inZone = locations.filter((location) => isWithinCoverage(location.longitude, location.latitude));
      setAddresses(inZone);
      if (!inZone.length) setError("Адрес в зоне сервиса не найден. Уточните улицу и номер дома.");
    } catch {
      if (!controller.signal.aborted) setError("Не удалось найти адрес. Повторите поиск.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <div className="stop-directory">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Свернуть список остановок" : "Список остановок"}
      </button>
      {open && (
        <div className="stop-directory__content">
          <label>
            Остановка или адрес
            <input
              value={query}
              onChange={(event) => editQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void searchAddress(); }}
              placeholder="Название, улица или номер дома"
            />
          </label>
          <button type="button" disabled={!phrase || pending} onClick={() => void searchAddress()}>
            {pending ? "Ищем адрес…" : "Найти по адресу"}
          </button>
          {error && <p role="status">{error}</p>}
          {addresses.length > 0 && (
            <ul aria-label="Найденные адреса">
              {addresses.map((point) => (
                <li key={point.longitude + ":" + point.latitude}>
                  <button type="button" onClick={() => {
                    setNearAddress(point);
                    setAddresses([]);
                    setLimit(pageSize);
                    onLocate(point);
                  }}>{point.label}</button>
                </li>
              ))}
            </ul>
          )}
          {nearAddress && <p>Остановки рядом с адресом «{nearAddress.label}»</p>}
          {failed ? <p>Не удалось загрузить список остановок.</p> : !loaded
            ? <p>Загружаем остановки…</p>
            : visibleStops.length === 0 && <p>Остановки по запросу не найдены.</p>}
          <ul aria-label="Остановки на карте">
            {visibleStops.slice(0, limit).map((stop) => (
              <li key={stop.id}>
                <button type="button" onClick={() => {
                  onLocate({ ...stop, label: stop.name }, stop.id);
                  setOpen(false);
                }}>
                  {stop.name}
                  {(stop.zone || stop.stop_code) && <small>{[stop.zone, stop.stop_code].filter(Boolean).join(" · ")}</small>}
                </button>
              </li>
            ))}
          </ul>
          {visibleStops.length > limit && (
            <button type="button" onClick={() => setLimit(limit + pageSize)}>Показать ещё</button>
          )}
        </div>
      )}
    </div>
  );
}
