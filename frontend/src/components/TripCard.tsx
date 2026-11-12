
import BusLogo from "./BusLogo";

export type RideMode = "now" | "scheduled";

export type RidePreview = {
  pickupMinutes: number;
  rideMinutes: number;
  availableSeats: number;
  pricePerSeat: number;
};

type TripCardProps = {
  ride: RidePreview;
  mode: RideMode;
  passengers: number;
};

export default function TripCard({
  ride,
  mode,
  passengers,
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
          <span>В пути</span>
          <strong>~{ride.rideMinutes} мин</strong>
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
        className="ride-preview__button"
        disabled
      >
        Оформление пока недоступно
      </button>

      <p className="ride-preview__note">
        Время подачи, длительность, места и стоимость
        демонстрационные. Реальный поиск пока не подключён.
      </p>
    </article>
  );
}
