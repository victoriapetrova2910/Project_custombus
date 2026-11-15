
import { AVERAGE_BUS_SPEED_KMH } from "../api/driveTime";
import BusLogo from "./BusLogo";

export type RideMode = "now" | "scheduled";

export type RidePreview = {
  pickupMinutes: number;
  rideMinutes: number | null;
  estimatingDuration?: boolean;
  availableSeats: number;
  pricePerSeat: number;
};

type TripCardProps = {
  ride: RidePreview;
  mode: RideMode;
  passengers: number;
  onBook?: () => void;
};

export default function TripCard({
  ride,
  mode,
  passengers,
  onBook,
}: TripCardProps) {
  const totalPrice = ride.pricePerSeat * passengers;

  return (
    <article className="ride-preview">
      <div className="ride-preview__header">
        <div className="ride-preview__vehicle">
          <div className="ride-preview__icon">
            <BusLogo />
          </div>

          <div>
            <h2>Микроавтобус «По пути»</h2>
            <p>Пример предложения транспорта</p>
          </div>
        </div>

        <span className="ride-preview__badge">
          Демо
        </span>
      </div>

      <div className="ride-preview__metrics">
        <div className="ride-preview__metric">
          <span>
            {mode === "now" ? "Подача" : "Время подачи"}
          </span>

          <strong>
            {mode === "now"
              ? `~${ride.pickupMinutes} мин`
              : "После подтверждения"}
          </strong>
        </div>

        <div className="ride-preview__metric">
          <span>В пути по дорогам</span>
          <strong>{ride.estimatingDuration ? "Считаем…" : ride.rideMinutes === null ? "Нет оценки" : "≈ " + ride.rideMinutes + " мин"}</strong>
        </div>

        <div className="ride-preview__metric">
          <span>Стоимость</span>
          <strong>
            {totalPrice.toLocaleString("ru-RU")} ₽
          </strong>
        </div>
      </div>

      <div className="ride-preview__footer">
        <p>
          Пример вместимости: {ride.availableSeats} мест
        </p>

        <p>
          {ride.pricePerSeat} ₽ за пассажира
        </p>
      </div>

      <button
        type="button"
        className={`ride-preview__button ${onBook ? "ride-preview__button--active" : ""}`}
        onClick={onBook}
        disabled={!onBook}
      >
        {onBook ? "Забронировать поездку" : "Оформление пока недоступно"}
      </button>

      <p className="ride-preview__note">
        Оценка рассчитана по длине маршрута и средней скорости {AVERAGE_BUS_SPEED_KMH} км/ч. Пробки, посадка и дополнительные заезды могут изменить время. Подача и места показаны на демоданных.
      </p>
    </article>
  );
}
