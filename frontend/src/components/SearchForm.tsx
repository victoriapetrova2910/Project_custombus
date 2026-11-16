
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { listServiceStops, type ServiceStop } from "../api/stops";

import StopSelect from "./StopSelect";
import type { MapPicker, MapPoint } from "./ServiceMap";

type SearchMode = "now" | "scheduled";

function isSamePoint(left: MapPoint, right: MapPoint) {
  return (left.stopId !== undefined && left.stopId === right.stopId) ||
    (left.latitude.toFixed(5) === right.latitude.toFixed(5) &&
      left.longitude.toFixed(5) === right.longitude.toFixed(5));
}


function MapPickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="route-map-icon" aria-label={label} title={label} onClick={onClick}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </button>
  );
}

export default function SearchForm({
  onPick, onCancelPick,
}: {
  onPick: (picker: MapPicker) => void;
  onCancelPick: () => void;
}) {
  const navigate = useNavigate();

  const [mode, setMode] = useState<SearchMode>("now");
  const [mapPoints, setMapPoints] = useState<Partial<Record<MapPicker["field"], MapPoint>>>({});
  const [addressText, setAddressText] = useState({ from: "", to: "" });
  const [addressStops, setAddressStops] = useState<ServiceStop[]>();
  const [addressStopsFailed, setAddressStopsFailed] = useState(false);
  const [scheduledStopsFailed, setScheduledStopsFailed] = useState(false);
  const [stopAttempt, setStopAttempt] = useState(0);
  const [scheduledStops, setScheduledStops] = useState<ServiceStop[]>();
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState("");

  const scheduled = mode === "scheduled";
  const fromValue = mapPoints.from?.label ?? addressText.from;
  const toValue = mapPoints.to?.label ?? addressText.to;

  useEffect(() => {
    if (addressStops) return;
    const controller = new AbortController();
    listServiceStops(controller.signal).then(
      (stops) => { if (!controller.signal.aborted) setAddressStops(stops); },
      () => { if (!controller.signal.aborted) setAddressStopsFailed(true); },
    );
    return () => controller.abort();
  }, [addressStops, stopAttempt]);

  useEffect(() => {
    if (!scheduled || scheduledStops) return;
    const controller = new AbortController();
    listServiceStops(controller.signal, "scheduled").then(
      (stops) => { if (!controller.signal.aborted) setScheduledStops(stops); },
      () => { if (!controller.signal.aborted) setScheduledStopsFailed(true); },
    );
    return () => controller.abort();
  }, [scheduled, scheduledStops, stopAttempt]);

  function retryStops() {
    setAddressStopsFailed(false);
    setScheduledStopsFailed(false);
    setError("");
    setStopAttempt((attempt) => attempt + 1);
  }

  function selectPoint(field: MapPicker["field"], point: MapPoint) {
    const other = mapPoints[field === "from" ? "to" : "from"];
    if (other && isSamePoint(point, other)) {
      setError("Остановки должны отличаться.");
      return;
    }
    setMapPoints((previous) => ({ ...previous, [field]: point }));
    setAddressText((previous) => ({ ...previous, [field]: point.label }));
    setError("");
  }

  function editAddress(field: MapPicker["field"], value: string) {
    setAddressText((previous) => ({ ...previous, [field]: value }));
    setMapPoints((previous) => ({ ...previous, [field]: undefined }));
    setError("");
  }

  function chooseOnMap(field: MapPicker["field"]) {
    onPick({
      field,
      onSelect: (point) => selectPoint(field, point),
    });
  }

  function swapStops() {
    onCancelPick();
    setMapPoints(({ from, to }) => ({ from: to, to: from }));
    setAddressText(({ from, to }) => ({ from: to, to: from }));
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!mapPoints.from || !mapPoints.to) {
      setError("Выберите оба адреса из подсказок или укажите точки на карте.");
      return;
    }

    if (isSamePoint(mapPoints.from, mapPoints.to)) {
      setError("Остановки должны отличаться.");
      return;
    }

    if (!Number.isInteger(passengers) || passengers < 1 || (scheduled && passengers > 10)) {
      setError(scheduled ? "Укажите от 1 до 10 пассажиров." : "Укажите корректное количество пассажиров.");
      return;
    }

    const params = new URLSearchParams({
      mode,
      from: fromValue.trim(),
      to: toValue.trim(),
      passengers: String(passengers),
    });

    if (scheduled) {
      if (!scheduledStops) {
        setError(scheduledStopsFailed
          ? "Не удалось проверить остановки из расписания. Повторите загрузку."
          : "Подождите, проверяем остановки из расписания.");
        return;
      }
      const fixedStops = [mapPoints.from, mapPoints.to].every((point) =>
        !point?.isAddress && scheduledStops.some((stop) => stop.id === point?.stopId)
      );
      if (!fixedStops) params.set("flex", "1");

      const fields = new FormData(event.currentTarget);
      const date = String(fields.get("date") ?? "");
      const time = String(fields.get("time") ?? "");
      if (!date || !time) {
        setError("Укажите дату и время поездки.");
        return;
      }

      const departure = new Date(`${date}T${time}+03:00`);
      const minutesUntil =
        (departure.getTime() - Date.now()) / 60000;

      if (!Number.isFinite(minutesUntil)) {
        setError("Некорректная дата или время.");
        return;
      }

      if (minutesUntil < 30) {
        setError("Предзаказ доступен минимум за 30 минут.");
        return;
      }

      if (minutesUntil > 48 * 60) {
        setError("Предзаказ доступен максимум за 48 часов.");
        return;
      }

      if (Number(time.slice(3, 5)) % 10 !== 0) {
        setError("Выберите время с шагом 10 минут.");
        return;
      }

      params.set("date", date);
      params.set("time", time);
    }

    for (const field of ["from", "to"] as const) {
      const point = mapPoints[field];
      if (!point) continue;
      params.set(field + "_lat", String(point.latitude));
      params.set(field + "_lon", String(point.longitude));
      if (point.isAddress) params.set(field + "_address", "1");
      if (point.stopId) params.set(field + "_stop_id", String(point.stopId));
    }

    navigate(`/search?${params.toString()}`);
  }

  return (
    <section className="booking-panel">
      <div className="booking-panel__heading">
        <span className="eyebrow">Сервис «По пути»</span>
        <h1>Куда поедем?</h1>
        <p>Выберите удобный способ поездки</p>
      </div>

      <div
        className="mode-switch"
        role="group"
        aria-label="Режим поездки"
      >
        <button
          type="button"
          className={mode === "now" ? "selected" : ""}
          aria-pressed={mode === "now"}
          onClick={() => {
            setMode("now");
            setError("");
          }}
        >
          Поехать сейчас
        </button>

        <button
          type="button"
          className={mode === "scheduled" ? "selected" : ""}
          aria-pressed={mode === "scheduled"}
          onClick={() => {
            onCancelPick();
            setMode("scheduled");
            setError("");
          }}
        >
          Запланировать
        </button>
      </div>

      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="route-inputs">
          {/* Остановка отправления */}
          <div className="route-input">
            <span className="route-dot route-dot--start" />
            <StopSelect
              label="Откуда"
              value={fromValue}
              stops={addressStops ?? []}
              selected={Boolean(mapPoints.from)}
              onEdit={(value) => editAddress("from", value)}
              onSelect={(point) => selectPoint("from", point)}
            />
            <MapPickButton label="Выбрать точку отправления на карте" onClick={() => chooseOnMap("from")} />
          </div>

          <div className="route-divider" />

          {/* Кнопка обмена остановок */}
          <button
            type="button"
            className="route-swap"
            onClick={swapStops}
            aria-label="Поменять остановки местами"
            title="Поменять остановки местами"
          >
            ↕
          </button>

          {/* Остановка назначения */}
          <div className="route-input">
            <span className="route-dot route-dot--finish" />
            <StopSelect
              label="Куда"
              value={toValue}
              stops={addressStops ?? []}
              selected={Boolean(mapPoints.to)}
              onEdit={(value) => editAddress("to", value)}
              onSelect={(point) => selectPoint("to", point)}
            />
            <MapPickButton label="Выбрать точку назначения на карте" onClick={() => chooseOnMap("to")} />
          </div>
        </div>

        {(addressStopsFailed || (scheduled && scheduledStopsFailed)) ? (
          <div className="stop-load-status" role="alert">
            {addressStopsFailed ? "Не удалось загрузить справочник остановок." : "Не удалось загрузить остановки из расписания."}
            <button type="button" onClick={retryStops}>Повторить</button>
          </div>
        ) : (!addressStops || (scheduled && !scheduledStops)) && (
          <p className="stop-load-status" role="status">Загружаем остановки…</p>
        )}

        {(mapPoints.from?.isAddress || mapPoints.to?.isAddress) && (
          <p className="map-picker__notice" role="status">При выборе адреса возможны незначительные задержки.</p>
        )}

        {scheduled && (
          <div className="date-time-fields">
            <label className="form-field">
              <span>Дата поездки</span>

              <input
                type="date"
                name="date"
              />
            </label>

            <label className="form-field">
              <span>Время поездки</span>

              <input
                type="time"
                step={600}
                name="time"
              />
            </label>
          </div>
        )}

        <label className="form-field">
          <span>Количество пассажиров</span>

          <input
            type="number"
            min={1}
            max={scheduled ? 10 : undefined}
            step={1}
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
          />
        </label>

        <p className="mode-hint">
          {mode === "now"
            ? "Поиск ближайшей доступной поездки."
            : "Выберите точки на карте и укажите московское время отправления от 30 минут до 48 часов вперёд."}
        </p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="search-button"

        >
          {mode === "now"
            ? "Найти поездку сейчас"
            : "Найти поездку на дату"}

          <span aria-hidden="true">→</span>
        </button>
      </form>

      {!scheduled && (
        <p className="prototype-note">Режим «Поехать сейчас» работает на демоданных.</p>
      )}
    </section>
  );
}
