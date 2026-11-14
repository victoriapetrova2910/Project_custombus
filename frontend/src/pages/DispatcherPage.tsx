import { useState } from "react";
import BoardingCheck from "../components/BoardingCheck";
import KPI from "../components/dashboard/KPI";
import DemandChart, { type DemandPoint } from "../components/dashboard/DemandChart";
import CancellationChart, {
  type CancellationCategory,
} from "../components/dashboard/CancellationChart";
import LoadChart, { type ZoneLoad } from "../components/dashboard/LoadChart";

type DispatcherTrip = {
  id: number;
  busNumber: string;
  zone: string;
  route: string;
  departureTime: string;
  totalSeats: number;
  occupiedSeats: number;
  status: "scheduled" | "active" | "completed";
};

const initialDemoTrips: DispatcherTrip[] = [
  {
    id: 1,
    busNumber: "A 234 BC 77",
    zone: "Коммунарка",
    route: "Метро Прокшино → ул. Александры Монаховой",
    departureTime: "08:20",
    totalSeats: 16,
    occupiedSeats: 14,
    status: "completed",
  },
  {
    id: 2,
    busNumber: "B 567 MK 77",
    zone: "Коммунарка",
    route: "Городище → ЖК Испанские Кварталы",
    departureTime: "08:40",
    totalSeats: 16,
    occupiedSeats: 16,
    status: "completed",
  },
  {
    id: 3,
    busNumber: "C 890 OP 77",
    zone: "Троицк",
    route: "Сиреневый бульвар → м. Тёплый Стан",
    departureTime: "09:10",
    totalSeats: 18,
    occupiedSeats: 13,
    status: "active",
  },
  {
    id: 4,
    busNumber: "E 123 TX 77",
    zone: "Сколково",
    route: "Иннопарк → Хаб Сколково",
    departureTime: "09:30",
    totalSeats: 14,
    occupiedSeats: 11,
    status: "active",
  },
  {
    id: 5,
    busNumber: "M 444 AB 77",
    zone: "Коммунарка",
    route: "Метро Ольховая → Столбово",
    departureTime: "10:00",
    totalSeats: 16,
    occupiedSeats: 10,
    status: "scheduled",
  },
  {
    id: 6,
    busNumber: "H 789 OP 77",
    zone: "Троицк",
    route: "Микрорайон «В» → Троицкий лес",
    departureTime: "10:30",
    totalSeats: 18,
    occupiedSeats: 8,
    status: "scheduled",
  },
];

const demoDemandData: DemandPoint[] = [
  { hour: "06:00", demand: 8 },
  { hour: "07:00", demand: 28, isPeak: true },
  { hour: "08:00", demand: 54, isPeak: true },
  { hour: "09:00", demand: 46, isPeak: true },
  { hour: "10:00", demand: 22 },
  { hour: "11:00", demand: 16 },
  { hour: "12:00", demand: 19 },
  { hour: "13:00", demand: 21 },
  { hour: "14:00", demand: 18 },
  { hour: "15:00", demand: 24 },
  { hour: "16:00", demand: 32 },
  { hour: "17:00", demand: 49, isPeak: true },
  { hour: "18:00", demand: 58, isPeak: true },
  { hour: "19:00", demand: 42, isPeak: true },
  { hour: "20:00", demand: 26 },
  { hour: "21:00", demand: 14 },
];

const demoCancellationCategories: CancellationCategory[] = [
  {
    timing: "Мгновенная отмена (до 10 мин)",
    count: 14,
    percentage: 42,
    refundPolicy: "100% возврат средств",
    color: "#22c55e",
  },
  {
    timing: "За 2 часа и более до рейса",
    count: 12,
    percentage: 36,
    refundPolicy: "50% возврат средств",
    color: "#3b82f6",
  },
  {
    timing: "От 30 мин до 2 часов",
    count: 5,
    percentage: 15,
    refundPolicy: "50% возврат средств",
    color: "#f59e0b",
  },
  {
    timing: "Менее 30 минут до подачи",
    count: 2,
    percentage: 7,
    refundPolicy: "0% возврат (штраф за срыв брони)",
    color: "#ef4444",
  },
];

const demoZoneLoads: ZoneLoad[] = [
  {
    zone: "Коммунарка",
    plannedPercent: 75,
    actualPercent: 84,
    activeVehicles: 8,
    totalSeats: 128,
    occupiedSeats: 108,
  },
  {
    zone: "Троицк",
    plannedPercent: 70,
    actualPercent: 76,
    activeVehicles: 5,
    totalSeats: 90,
    occupiedSeats: 68,
  },
  {
    zone: "Сколково",
    plannedPercent: 65,
    actualPercent: 69,
    activeVehicles: 4,
    totalSeats: 56,
    occupiedSeats: 39,
  },
];

export default function DispatcherPage() {
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredTrips = initialDemoTrips.filter((trip) => {
    const matchesZone = selectedZone === "all" || trip.zone === selectedZone;
    const matchesStatus = selectedStatus === "all" || trip.status === selectedStatus;
    return matchesZone && matchesStatus;
  });

  const statuses = {
    scheduled: { label: "Запланирован", className: "pending" },
    active: { label: "На линии", className: "confirmed" },
    completed: { label: "Завершён", className: "completed" },
  };

  return (
    <main className="dispatcher-page">
      <div className="dispatcher-container">
        <header className="dispatcher-header">
          <div>
            <h1>Панель диспетчера</h1>
            <p>Рейсы, спрос и загрузка микроавтобусов</p>
          </div>
          <span className="dispatcher-demo">Демонстрационные данные</span>
        </header>

        <BoardingCheck />

        <section className="dispatcher-section" aria-label="Сводка">
          <KPI
            data={{
              totalPreorders: 342,
              completedTrips: 298,
              cancelledTrips: 33,
              noShowCount: 11,
              avgFleetLoad: 78,
            }}
          />
        </section>

        <section className="dispatcher-section table-card" aria-labelledby="trips-heading">
          <div className="table-card__header">
            <div>
              <h2 id="trips-heading">Рейсы</h2>
              <p aria-live="polite">
                Показано рейсов: {filteredTrips.length} из {initialDemoTrips.length}
              </p>
            </div>

            <div className="table-filters">
              <select
                className="filter-select"
                aria-label="Зона рейса"
                value={selectedZone}
                onChange={(event) => setSelectedZone(event.target.value)}
              >
                <option value="all">Все зоны</option>
                <option value="Коммунарка">Коммунарка</option>
                <option value="Троицк">Троицк</option>
                <option value="Сколково">Сколково</option>
              </select>

              <select
                className="filter-select"
                aria-label="Статус рейса"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="all">Все статусы</option>
                <option value="scheduled">Запланирован</option>
                <option value="active">На линии</option>
                <option value="completed">Завершён</option>
              </select>
            </div>
          </div>

          <div className="table-responsive" role="region" aria-label="Таблица рейсов" tabIndex={0}>
            <table className="trips-table">
              <thead>
                <tr>
                  <th scope="col">№</th>
                  <th scope="col">Транспорт</th>
                  <th scope="col">Зона</th>
                  <th scope="col">Маршрут</th>
                  <th scope="col">Отправление</th>
                  <th scope="col">Заполняемость</th>
                  <th scope="col">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length === 0 && (
                  <tr>
                    <td colSpan={7} className="trips-table__empty">
                      Нет рейсов по выбранным фильтрам.
                    </td>
                  </tr>
                )}

                {filteredTrips.map((trip) => {
                  const load = Math.round((trip.occupiedSeats / trip.totalSeats) * 100);
                  const status = statuses[trip.status];

                  return (
                    <tr key={trip.id}>
                      <td><strong>#{trip.id}</strong></td>
                      <td><span className="bus-number-badge">{trip.busNumber}</span></td>
                      <td>{trip.zone}</td>
                      <td className="route-cell">{trip.route}</td>
                      <td><strong>{trip.departureTime}</strong></td>
                      <td>
                        <div className="load-cell">
                          <span>{trip.occupiedSeats} / {trip.totalSeats} ({load}%)</span>
                          <div className="load-mini-bar" aria-hidden="true">
                            <div className="load-mini-fill" style={{ width: `${load}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dispatcher-section" aria-labelledby="analytics-heading">
          <h2 className="dispatcher-section__title" id="analytics-heading">Аналитика</h2>
          <div className="charts-grid">
            <DemandChart data={demoDemandData} />
            <LoadChart zones={demoZoneLoads} />
            <CancellationChart categories={demoCancellationCategories} />
          </div>
        </section>
      </div>
    </main>
  );
}