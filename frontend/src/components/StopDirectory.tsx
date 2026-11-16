import { useEffect, useRef, useState } from "react";
import { findMapAddress } from "../api/mapAddress";
import { getStops, type StopPage } from "../api/stops";
import { isWithinCoverage } from "../mapCoverage";
import StopSearch from "./StopSearch";

type Coordinates = { latitude: number; longitude: number };
type AddressPoint = Coordinates & { label: string };
type StopResult = { key: string; page?: StopPage; error?: string };
const pageSize = 30;

export default function StopDirectory({ center, onLocate }: {
  center: Coordinates;
  onLocate: (point: AddressPoint, stopId?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [subzone, setSubzone] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<StopResult>();
  const [addresses, setAddresses] = useState<AddressPoint[]>([]);
  const [nearAddress, setNearAddress] = useState<AddressPoint>();
  const [pending, setPending] = useState(false);
  const [addressError, setAddressError] = useState("");
  const requestRef = useRef<AbortController>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const q = nearAddress ? "" : query.trim();
  const subzoneQuery = subzone.trim();
  const lat = nearAddress?.latitude;
  const lon = nearAddress?.longitude;
  const key = JSON.stringify([q, zone, subzoneQuery, activeOnly, offset, attempt, lat, lon]);
  const current = result?.key === key ? result : undefined;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getStops({
        q, zone, subzone: subzoneQuery, service_active: activeOnly ? true : undefined,
        catalog_query: Boolean(q), lat, lon, limit: pageSize, offset,
      }, controller.signal).then(
        (page) => { if (!controller.signal.aborted) setResult({ key, page }); },
        () => {
          if (!controller.signal.aborted) setResult({ key, error: "Не удалось загрузить список остановок." });
        },
      );
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, key, q, zone, subzoneQuery, activeOnly, offset, lat, lon]);

  function editQuery(value: string) {
    requestRef.current?.abort();
    setPending(false);
    setQuery(value);
    setOffset(0);
    setAddresses([]);
    setNearAddress(undefined);
    setAddressError("");
  }

  async function searchAddress() {
    if (!query.trim()) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setAddressError("");
    setAddresses([]);
    setNearAddress(undefined);
    setOffset(0);
    try {
      const locations = await findMapAddress(query.trim(), center.latitude, center.longitude, controller.signal);
      if (controller.signal.aborted) return;
      const inZone = locations.filter((location) => isWithinCoverage(location.longitude, location.latitude));
      setAddresses(inZone);
      if (!inZone.length) setAddressError("Адрес в зоне сервиса не найден. Уточните улицу и номер дома.");
    } catch {
      if (!controller.signal.aborted) setAddressError("Не удалось найти адрес. Повторите поиск.");
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
          <StopSearch value={query} pending={pending} onChange={editQuery} onFindAddress={() => void searchAddress()} />
          <div className="stop-directory__filters">
            <label>
              Зона
              <select value={zone} onChange={(event) => { setZone(event.target.value); setOffset(0); }}>
                <option value="">Все зоны</option>
                <option value="НАО">НАО</option>
                <option value="ТАО">ТАО</option>
                <option value="Сколково">Сколково</option>
              </select>
            </label>
            <label>
              Подзона
              <input value={subzone} placeholder="Например, Щербинка" onChange={(event) => {
                setSubzone(event.target.value);
                setOffset(0);
              }} />
            </label>
          </div>
          <label className="stop-directory__checkbox">
            <input type="checkbox" checked={activeOnly} onChange={(event) => {
              setActiveOnly(event.target.checked);
              setOffset(0);
            }} />
            Только активные остановки
          </label>
          {addressError && <p role="status">{addressError}</p>}
          {addresses.length > 0 && (
            <ul aria-label="Найденные адреса">
              {addresses.map((point) => (
                <li key={point.longitude + ":" + point.latitude}>
                  <button type="button" onClick={() => {
                    setNearAddress(point);
                    setAddresses([]);
                    setOffset(0);
                    onLocate(point);
                  }}>{point.label}</button>
                </li>
              ))}
            </ul>
          )}
          {nearAddress && <p>Остановки рядом с адресом «{nearAddress.label}»</p>}
          {!current && <p role="status">Загружаем остановки…</p>}
          {current?.error && (
            <div role="alert">
              <p>{current.error}</p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>Повторить</button>
            </div>
          )}
          {current?.page?.total === 0 && <p role="status">Остановки по запросу не найдены.</p>}
          {current?.page && current.page.total > 0 && (
            <>
              <ul aria-label="Остановки на карте">
                {current.page.items.map((stop) => {
                  const unavailable = !stop.service_active
                    ? "Недоступна для бронирования"
                    : !isWithinCoverage(stop.longitude, stop.latitude) && "Вне зоны на карте проекта";
                  return (
                    <li key={stop.id}>
                      <button type="button" disabled={Boolean(unavailable)} onClick={() => {
                        onLocate({ ...stop, label: stop.name }, stop.id);
                        setOpen(false);
                      }}>
                        {stop.name}
                        <small>
                          {[stop.zone, stop.stop_code, stop.is_drt_hub && "Хаб",
                            unavailable].filter(Boolean).join(" · ")}
                        </small>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="stop-directory__pages" aria-label="Страницы справочника">
                <button type="button" disabled={offset === 0} onClick={() => setOffset(offset - pageSize)}>Назад</button>
                <span role="status">{offset + 1}–{offset + current.page.items.length} из {current.page.total}</span>
                <button type="button" disabled={offset + pageSize >= current.page.total}
                  onClick={() => setOffset(offset + pageSize)}>Дальше</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
