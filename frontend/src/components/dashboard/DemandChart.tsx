export type DemandPoint = {
  hour: string; // e.g. "07:00"
  demand: number; // bookings count
  isPeak?: boolean;
};

type DemandChartProps = {
  data: DemandPoint[];
};

export default function DemandChart({ data }: DemandChartProps) {
  const maxDemand = Math.max(...data.map((d) => d.demand), 1);

  return (
    <div className="dashboard-chart-card">
      <div className="chart-header">
        <div>
          <h3>Почасовой спрос</h3>
          <p>Распределение заказов пассажиров по времени суток</p>
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-color legend-color--peak" /> Пиковые часы
          </span>
          <span className="legend-item">
            <span className="legend-color legend-color--standard" /> Стандартные часы
          </span>
        </div>
      </div>

      <div className="demand-bars-container">
        {data.map((item) => {
          const heightPercent = Math.round((item.demand / maxDemand) * 100);
          return (
            <div key={item.hour} className="demand-bar-col">
              <span className="demand-bar-val">{item.demand}</span>
              <div className="demand-bar-track">
                <div
                  className={`demand-bar-fill ${
                    item.isPeak ? "demand-bar-fill--peak" : ""
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className="demand-bar-label">{item.hour}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
