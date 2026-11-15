import { useEffect, useState } from "react";
import { searchScheduledTrips, type TripSearchItem } from "../api/trips";
import { isPointWithinCoverage } from "../mapCoverage";
import SearchStatus from "./SearchStatus";

type Props = {
  fromStopId: number;
  toStopId: number;
  date: string;
  time: string;
  passengers: number;
  activeTripId?: number;
  onShowRoute: (trip: TripSearchItem) => void;
};

type Result = { items: TripSearchItem[]; error?: string };

function formatDeparture(timestamp: string) {
  const [date, time] = timestamp.split("T");
  return `${date.split("-").reverse().join(".")} в ${time.slice(0, 5)}`;
}

function formatPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU", { style: "currency", currency: "RUB" });
}

export default function ScheduledResults({
  fromStopId, toStopId, date, time, passengers, activeTripId, onShowRoute,
}: Props) {
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    searchScheduledTrips({
      from_stop_id: fromStopId,
      to_stop_id: toStopId,
      date,
      time,
      seats_count: passengers,
    }, controller.signal).then(
      ({ items }) => {
        if (!controller.signal.aborted) {
          setResult({ items: items.filter((trip) =>
            isPointWithinCoverage(trip.from_stop) && isPointWithinCoverage(trip.to_stop)
          ) });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          items: [],
          error: error instanceof TypeError
            ? "Не удалось связаться с сервером. Проверьте подключение и повторите поиск."
            : error instanceof Error ? error.message : "Сервер не вернул результаты поиска.",
        });
      },
    );
    return () => controller.abort();
  }, [fromStopId, toStopId, date, time, passengers, attempt]);

  if (result === null) return <SearchStatus state="loading" />;
  if (result.error) {
    return (
      <>
        <SearchStatus state="error" description={result.error} />
        <button type="button" className="btn btn--secondary" onClick={() => {
          setResult(null);
          setAttempt((value) => value + 1);
        }}>Повторить поиск</button>
      </>
    );
  }
  if (!result.items.length) {
    return <SearchStatus state="empty" description="На это время подходящих рейсов нет. Попробуйте другое время или маршрут." />;
  }

  return (
    <>
      <SearchStatus state="found" description={`Подходящих рейсов: ${result.items.length}. Время московское.`} />
      <div className="scheduled-results">
        {result.items.map((trip) => (
          <article className="ride-preview" key={trip.trip_id}>
            <div className="ride-preview__header">
              <div className="ride-preview__vehicle">
                <div>
                  <h2>Рейс №{trip.trip_id}</h2>
                  <p>{trip.from_stop.name} → {trip.to_stop.name}</p>
                </div>
              </div>
            </div>
            <div className="ride-preview__metrics">
              <div className="ride-preview__metric">
                <span>Посадка</span>
                <strong>{formatDeparture(trip.departure_time)}</strong>
              </div>
              <div className="ride-preview__metric">
                <span>В пути</span>
                <strong>{trip.duration_minutes} мин</strong>
              </div>
              <div className="ride-preview__metric">
                <span>Итого за {passengers}</span>
                <strong>{formatPrice(trip.total_price)}</strong>
              </div>
            </div>
            <div className="ride-preview__footer">
              <p>Свободно мест: {trip.available_seats}</p>
              <p>{formatPrice(trip.price_per_seat)} за место</p>
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              aria-pressed={activeTripId === trip.trip_id}
              onClick={() => onShowRoute(trip)}
            >
              Показать рейс на карте
            </button>
          </article>
        ))}
      </div>
      <p className="mode-hint">Оформление найденных рейсов пока недоступно.</p>
    </>
  );
}
