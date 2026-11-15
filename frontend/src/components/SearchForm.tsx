
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { listServiceStops, type ServiceStop } from "../api/trips";

import type { MapPicker, MapPoint } from "./ServiceMap";

type SearchMode = "now" | "scheduled";


export default function SearchForm({
  onPick, onCancelPick,
}: {
  onPick: (picker: MapPicker) => void;
  onCancelPick: () => void;
}) {
  const navigate = useNavigate();

  const [mode, setMode] = useState<SearchMode>("now");
  const [mapPoints, setMapPoints] = useState<Partial<Record<MapPicker["field"], MapPoint>>>({});
  const [scheduledStops, setScheduledStops] = useState<ServiceStop[]>();
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState("");

  const scheduled = mode === "scheduled";
  const fromValue = mapPoints.from?.label ?? "";
  const toValue = mapPoints.to?.label ?? "";

  useEffect(() => {
    if (!scheduled || scheduledStops) return;
    const controller = new AbortController();
    listServiceStops(controller.signal, "scheduled").then(
      (stops) => { if (!controller.signal.aborted) setScheduledStops(stops); },
      () => { if (!controller.signal.aborted) setScheduledStops([]); },
    );
    return () => controller.abort();
  }, [scheduled, scheduledStops]);

  function chooseOnMap(field: MapPicker["field"], showDirectory = false) {
    onPick({
      field,
      showDirectory,
      onSelect(point) {
        setMapPoints((previous) => ({ ...previous, [field]: point }));
        setError("");
      },
    });
  }

  function swapStops() {
    onCancelPick();
    setMapPoints(({ from, to }) => ({ from: to, to: from }));
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!fromValue.trim() || !toValue.trim()) {
      setError("Выберите отправление и назначение на карте.");
      return;
    }

    const samePoint = mapPoints.from && mapPoints.to
      ? mapPoints.from.latitude.toFixed(5) === mapPoints.to.latitude.toFixed(5) &&
        mapPoints.from.longitude.toFixed(5) === mapPoints.to.longitude.toFixed(5)
      : fromValue.trim().toLowerCase() === toValue.trim().toLowerCase();
    if (samePoint) {
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
        setError("Подождите, проверяем остановки из расписания.");
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
          <label className="route-input">
            <span className="route-dot route-dot--start" />

            <span className="field-content">
              <span className="field-label">Откуда</span>

              <input
                type="text"
                value={fromValue}
                readOnly
                onClick={() => chooseOnMap("from")}
                placeholder="Выберите на карте"
              />
            </span>
          </label>

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
          <label className="route-input">
            <span className="route-dot route-dot--finish" />

            <span className="field-content">
              <span className="field-label">Куда</span>

              <input
                type="text"
                value={toValue}
                readOnly
                onClick={() => chooseOnMap("to")}
                placeholder="Выберите на карте"
              />
            </span>
          </label>
        </div>

        <div className="route-map-actions">
          <button type="button" onClick={() => chooseOnMap("from")}>Откуда на карте</button>
          <button type="button" onClick={() => chooseOnMap("to")}>Куда на карте</button>
          <button type="button" onClick={() => chooseOnMap(mapPoints.from && !mapPoints.to ? "to" : "from", true)}>Список остановок</button>
          {(mapPoints.from?.isAddress || mapPoints.to?.isAddress) && (
            <p className="map-picker__notice" role="status">При выборе адреса возможны незначительные задержки.</p>
          )}
        </div>

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
