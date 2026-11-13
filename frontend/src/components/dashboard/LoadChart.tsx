export type ZoneLoad = {
  zone: string;
  plannedPercent: number;
  actualPercent: number;
  activeVehicles: number;
  totalSeats: number;
  occupiedSeats: number;
};

type LoadChartProps = {
  zones: ZoneLoad[];
};

export default function LoadChart({ zones }: LoadChartProps) {
  return (
    <div className="dashboard-chart-card">
      <div className="chart-header">
        <div>
          <h3>Загрузка транспорта по зонам (ФТ10)</h3>
          <p>Сравнение плановой и фактической утилизации вместимости микроавтобусов</p>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-color legend-color--plan" /> План
          </span>
          <span className="legend-item">
            <span className="legend-color legend-color--fact" /> Факт
          </span>
        </div>
      </div>

      <div className="zones-load-list">
        {zones.map((zone) => (
          <div key={zone.zone} className="zone-load-row">
            <div className="zone-info">
              <strong>{zone.zone}</strong>
              <small>
                {zone.activeVehicles} авт. • {zone.occupiedSeats} из {zone.totalSeats} мест
              </small>
            </div>

            <div className="zone-bars-comparison">
              {/* Плановая загрузка */}
              <div className="bar-wrapper">
                <span className="bar-tag">План</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill--plan"
                    style={{ width: `${zone.plannedPercent}%` }}
                  />
                </div>
                <span className="bar-percent">{zone.plannedPercent}%</span>
              </div>

              {/* Фактическая загрузка */}
              <div className="bar-wrapper">
                <span className="bar-tag">Факт</span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill--fact"
                    style={{ width: `${zone.actualPercent}%` }}
                  />
                </div>
                <span className="bar-percent">
                  <strong>{zone.actualPercent}%</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
