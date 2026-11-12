
import { Link, useSearchParams } from "react-router-dom";

import ServiceMap from "../components/ServiceMap";
import TripCard, {
  type RideMode,
  type RidePreview,
} from "../components/TripCard";

// Только демонстрационные данные для проверки дизайна.
const demoRide: RidePreview = {
  pickupMinutes: 12,
  rideMinutes: 25,
  availableSeats: 5,
  pricePerSeat: 150,
};

export default function SearchPage() {
  const [params] = useSearchParams();

  const mode: RideMode =
    params.get("mode") === "scheduled" ? "scheduled" : "now";

  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";

  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";

  const passengerCount = Number(params.get("passengers"));
  const passengers =
    Number.isInteger(passengerCount) && passengerCount > 0
      ? passengerCount
      : 1;

  const validRoute = Boolean(
    from &&
    to &&
    from.toLowerCase() !== to.toLowerCase() &&
    (mode === "now" || (date && time))
  );

  const formattedDate = date
    ? date.split("-").reverse().join(".")
    : "";

  return (
    <main className="workspace">
      <section className="results-panel">
        <Link to="/" className="results-back">
          ← Изменить маршрут
        </Link>

        <div className="results-heading">
          <span className="eyebrow">
            {mode === "now"
              ? "Поездка сейчас"
              : "Предварительный заказ"}
          </span>

          <h1>
            {mode === "now"
              ? "Поиск транспорта"
              : "Планирование поездки"}
          </h1>

          <p>
            {mode === "now"
              ? "Подберём подходящий микроавтобус для вашей поездки."
              : "Запланируйте поездку на удобную дату и время."}
          </p>
        </div>

        {validRoute ? (
          <>
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
                <span>
                  Пассажиры: {passengers}
                </span>

                {mode === "scheduled" && (
                  <span>
                    {formattedDate} в {time}
                  </span>
                )}
              </div>
            </div>

            <div className="demo-warning">
              Ниже показан демонстрационный вариант
              оформления. Реальный поиск пока не работает.
            </div>

            <TripCard
              ride={demoRide}
              mode={mode}
              passengers={passengers}
            />
          </>
        ) : (
          <div className="demo-warning">
            Параметры поездки не заполнены.
            Вернитесь на главную страницу и выберите маршрут.
          </div>
        )}
      </section>

      <div className="workspace__map">
        <ServiceMap />
      </div>
    </main>
  );
}
