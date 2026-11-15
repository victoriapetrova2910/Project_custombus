import { isPointWithinCoverage } from "../mapCoverage";
import { FARE_PER_PASSENGER } from "../fare";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useDemoAccount } from "../account/useDemoAccount";
import { AVERAGE_BUS_SPEED_KMH, formatRoadDistance, getDrivingRoute, type DrivingResult } from "../api/driveTime";
import type { TripRoute, TripSearchItem } from "../api/trips";
import BookingModal from "../components/BookingModal";
import ScheduledResults from "../components/ScheduledResults";
import ServiceMap from "../components/LazyServiceMap";
import SearchStatus, { type SearchState } from "../components/SearchStatus";
import TripCard, { type RideMode, type RidePreview } from "../components/TripCard";

const demoRide: RidePreview = {
  pickupMinutes: 12,
  rideMinutes: null,
  availableSeats: 5,
  pricePerSeat: FARE_PER_PASSENGER,
};

export default function SearchPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useDemoAccount();

  const [attempt, setAttempt] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [selection, setSelection] = useState<{ searchUrl: string; route: TripRoute }>();
  const searchUrl = location.pathname + location.search;
  const activeRoute = selection?.searchUrl === searchUrl ? selection.route : undefined;
  const resumeBooking = location.state?.resumeBooking === true;

  const mode: RideMode = params.get("mode") === "scheduled" ? "scheduled" : "now";
  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";
  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";
  const fromStopId = Number(params.get("from_stop_id"));
  const toStopId = Number(params.get("to_stop_id"));

  const fromPoint = params.has("from_lat") && params.has("from_lon")
    ? [params.get("from_lat"), params.get("from_lon")].join(",") : undefined;
  const toPoint = params.has("to_lat") && params.has("to_lon")
    ? [params.get("to_lat"), params.get("to_lon")].join(",") : undefined;
  const fromAddress = params.get("from_address") === "1";
  const toAddress = params.get("to_address") === "1";
  const addressSelected = fromAddress || toAddress;
  const flexible = mode === "scheduled" && (addressSelected || params.get("flex") === "1");
  const usesDemoSearch = mode === "now" || flexible;
  const departureTime = date && time ? new Date(date + "T" + time + "+03:00") : null;

  const endpoints = useMemo(() => {
    if (!fromPoint || !toPoint) return undefined;
    const [start, end] = [[fromPoint, from], [toPoint, to]].map(([point, label]) => {
      const [latitude, longitude] = point.split(",").map((value) => value.trim() ? Number(value) : NaN);
      return { latitude, longitude, label };
    });
    return isPointWithinCoverage(start) && isPointWithinCoverage(end) ? { start, end } : undefined;
  }, [fromPoint, toPoint, from, to]);
  const pointsInZone = Boolean(endpoints);
  const hasCoordinates = Boolean(fromPoint || toPoint);
  const routeKey = pointsInZone && fromPoint !== toPoint ? fromPoint + ";" + toPoint : undefined;
  const [driveTime, setDriveTime] = useState<{ key: string; attempt: number; result: DrivingResult }>();
  useEffect(() => {
    if (!routeKey) return;
    const controller = new AbortController();
    void getDrivingRoute(routeKey, controller.signal).then((result) => {
      if (!controller.signal.aborted) setDriveTime({ key: routeKey, attempt, result });
    });
    return () => controller.abort();
  }, [routeKey, attempt]);
  const drivingResult = driveTime?.key === routeKey && driveTime?.attempt === attempt ? driveTime?.result : undefined;
  const mapJourney = useMemo(() => endpoints ? {
    ...endpoints,
    geometry: drivingResult?.state === "found" ? drivingResult.geometry : undefined,
  } : undefined, [endpoints, drivingResult]);
  const ride: RidePreview = {
    ...demoRide,
    rideMinutes: drivingResult?.state === "found" ? drivingResult.minutes : null,
  };

  const passengerCount = Number(params.get("passengers"));
  const passengers =
    Number.isInteger(passengerCount) && passengerCount > 0 ? passengerCount : 1;
  const searchState: SearchState = passengers > demoRide.availableSeats
    ? "empty"
    : !routeKey ? "error" : drivingResult?.state ?? "loading";
  const searchDescription = passengers > demoRide.availableSeats
    ? "В демонстрационном автобусе недостаточно мест для этого заказа."
    : searchState === "empty"
      ? "Для выбранных точек дорожный маршрут недоступен. Попробуйте другие точки."
      : !routeKey
        ? "Координаты точек не переданы. Выберите маршрут на карте."
        : undefined;

  const validRoute = Boolean(
    (!hasCoordinates || pointsInZone) &&
    from &&
      to &&
      (mode === "now"
        ? (fromPoint && toPoint ? fromPoint !== toPoint : from.toLowerCase() !== to.toLowerCase())
        : departureTime && Number.isFinite(departureTime.getTime()) && passengers <= 10 &&
          (flexible ? mapJourney : Number.isSafeInteger(fromStopId) && fromStopId > 0 &&
            Number.isSafeInteger(toStopId) && toStopId > 0 && fromStopId !== toStopId)),
  );

  const formattedDate = date ? date.split("-").reverse().join(".") : "";

  function showRoute(trip: TripSearchItem) {
    setSelection({
      searchUrl,
      route: { tripId: trip.trip_id, fromStopId: trip.from_stop.id, toStopId: trip.to_stop.id },
    });
  }

  function handleBook() {
    if (profile) {
      setIsBookingModalOpen(true);
      return;
    }

    navigate("/login", {
      state: { from: searchUrl, resumeBooking: true },
    });
  }

  function handleCloseBooking() {
    setIsBookingModalOpen(false);

    if (resumeBooking) {
      navigate(searchUrl, { replace: true, state: null });
    }
  }

  return (
    <main className="workspace workspace--map-overlay">
      <section className="results-panel">
        <Link to="/" className="results-back">
          ← Изменить маршрут
        </Link>

        <div className="results-heading">
          <span className="eyebrow">
            {mode === "now" ? "Поездка сейчас" : "Предварительный заказ"}
          </span>

          <h1>Поиск транспорта</h1>

          <p>
            {mode === "now"
              ? "Подбираем подходящий микроавтобус."
              : "Проверяем возможность поездки на выбранное время."}
          </p>
        </div>

        {validRoute ? (
          <>
            {addressSelected && (
              <p className="map-picker__notice" role="status">При выборе адреса возможны незначительные задержки.</p>
            )}
            <div className="ride-summary">
              <div className="ride-summary__point">
                <span className="route-dot route-dot--start" />
                <div>
                  <small>Откуда</small>
                  <strong>{from}</strong>
                </div>
              </div>

              <div className="ride-summary__point">
                <span className="route-dot route-dot--finish" />
                <div>
                  <small>Куда</small>
                  <strong>{to}</strong>
                </div>
              </div>

              <div className="ride-summary__extra">
                <span>Пассажиры: {passengers}</span>
                {mode === "scheduled" && (
                  <span>{formattedDate} в {time}</span>
                )}
              </div>
              {drivingResult?.state === "found" && (
                <div className="ride-summary__extra">
                  <span>По дорогам: {formatRoadDistance(drivingResult.distanceMeters)}</span>
                  {!usesDemoSearch && <span>Оценка в пути: ≈ {drivingResult.minutes} мин при {AVERAGE_BUS_SPEED_KMH} км/ч</span>}
                </div>
              )}
            </div>

            {!usesDemoSearch ? (
              <ScheduledResults
                key={`${fromStopId}:${toStopId}:${date}:${time}:${passengers}`}
                fromStopId={fromStopId}
                toStopId={toStopId}
                date={date}
                time={time}
                passengers={passengers}
                activeTripId={activeRoute?.tripId}
                onShowRoute={showRoute}
              />
            ) : (
              <>
                <div className="demo-warning">
                  {flexible
                    ? "Предзаказ вне расписания оформляется в деморежиме."
                    : "Демонстрация интерфейса. Поиск реального транспорта пока не подключён."}
                </div>

                <SearchStatus state={searchState} description={searchDescription} />
                {searchState === "error" && routeKey && (
                  <button type="button" className="btn btn--secondary" onClick={() => setAttempt((count) => count + 1)}>
                    Повторить поиск
                  </button>
                )}

                {searchState === "found" && (
                  <>
                    <TripCard
                      ride={ride}
                      mode={mode}
                      passengers={passengers}
                      onBook={handleBook}
                    />

                    {profile && (isBookingModalOpen || resumeBooking) && (
                      <BookingModal
                        userId={profile.id}
                        onClose={handleCloseBooking}
                        ride={{
                          tripId: 1,
                          from,
                          to,
                          departureTime: flexible ? departureTime?.toISOString() : undefined,
                          pickupMinutes: demoRide.pickupMinutes,
                          pricePerSeat: demoRide.pricePerSeat,
                          availableSeats: demoRide.availableSeats,
                          passengers,
                          mode,
                        }}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <div className="demo-warning">
            {hasCoordinates && !pointsInZone
              ? "Выберите точки отправления и назначения внутри зоны обслуживания."
              : "Параметры поездки не заполнены. Вернитесь на главную страницу и выберите маршрут."}
          </div>
        )}
      </section>

      <div className="workspace__map workspace__map--results">
        <ServiceMap route={activeRoute} journey={validRoute && !activeRoute ? mapJourney : undefined} />
      </div>
    </main>
  );
}