import { useState } from "react";
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
  const [trips] = useState<DispatcherTrip[]>(initialDemoTrips);

  const filteredTrips = trips.filter((t) => {
    if (selectedZone !== "all" && t.zone !== selectedZone) return false;
    if (selectedStatus !== "all" && t.status !== selectedStatus) return false;
    return true;
  });

  const getStatusLabel = (status: DispatcherTrip["status"]) => {
    switch (status) {
      case "completed":
        return <span className="status-badge status-badge--completed">Завершён</span>;
      case "active":
        return <span className="status-badge status-badge--confirmed">На линии</span>;
      case "scheduled":
        return <span className="status-badge status-badge--pending">Запланирован</span>;
    }
  };

  return (
    <main className="dispatcher-page">
      <div className="dispatcher-container">
        {/* Заголовок и бейдж ФТ10 */}
        <div className="dispatcher-header">
          <div>
            <div className="dispatcher-badge-row">
              <span className="eyebrow">Мониторинг и аналитика</span>
              <span className="demo-badge-pill">ФТ10 • Оценка эффективности</span>
            </div>
            <h1>Диспетчерская панель «По пути»</h1>
            <p>
              Контроль выполнения запланированных рейсов, анализ спроса и загрузки подвижного состава
            </p>
          </div>
          <div className="dispatcher-time-indicator">
            <span className="live-dot" />
            <span>Система активна • Обновлено только что</span>
          </div>
        </div>

        {/* 1. Блок ключевых показателей (KPI) */}
        <section className="dispatcher-section">
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

        {/* 2. Графики: спрос, отмены, загрузка */}
        <section className="dispatcher-section">
          <div className="charts-grid">
            <DemandChart data={demoDemandData} />
            <div className="charts-grid__sub">
              <LoadChart zones={demoZoneLoads} />
              <CancellationChart categories={demoCancellationCategories} />
            </div>
          </div>
        </section>

        {/* 3. Оперативная таблица рейсов с фильтрацией */}
        <section className="dispatcher-section">
          <div className="table-card">
            <div className="table-card__header">
              <div>
                <h3>Оперативный план рейсов</h3>
                <p>Назначенные микроавтобусы и текущая заполняемость рейсов</p>
              </div>

              <div className="table-filters">
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Все зоны</option>
                  <option value="Коммунарка">Коммунарка</option>
                  <option value="Троицк">Троицк</option>
                  <option value="Сколково">Сколково</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Все статусы</option>
                  <option value="scheduled">Запланирован</option>
                  <option value="active">На линии</option>
                  <option value="completed">Завершён</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="trips-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Транспорт</th>
                    <th>Зона</th>
                    <th>Маршрут</th>
                    <th>Отправление</th>
                    <th>Заполняемость</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => {
                    const percent = Math.round(
                      (trip.occupiedSeats / trip.totalSeats) * 100
                    );
                    return (
                      <tr key={trip.id}>
                        <td>
                          <strong>#{trip.id}</strong>
                        </td>
                        <td>
                          <span className="bus-number-badge">{trip.busNumber}</span>
                        </td>
                        <td>{trip.zone}</td>
                        <td className="route-cell">{trip.route}</td>
                        <td>
                          <strong>{trip.departureTime}</strong>
                        </td>
                        <td>
                          <div className="load-cell">
                            <span>
                              {trip.occupiedSeats} / {trip.totalSeats} ({percent}%)
                            </span>
                            <div className="load-mini-bar">
                              <div
                                className="load-mini-fill"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor:
                                    percent >= 85
                                      ? "#22c55e"
                                      : percent >= 50
                                      ? "#3b82f6"
                                      : "#f59e0b",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>{getStatusLabel(trip.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
