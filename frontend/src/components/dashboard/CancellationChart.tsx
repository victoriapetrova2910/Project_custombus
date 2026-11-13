export type CancellationCategory = {
  timing: string;
  count: number;
  percentage: number;
  refundPolicy: string;
  color: string;
};

type CancellationChartProps = {
  categories: CancellationCategory[];
};

export default function CancellationChart({ categories }: CancellationChartProps) {
  return (
    <div className="dashboard-chart-card">
      <div className="chart-header">
        <div>
          <h3>Аналитика отмен предзаказов (ФТ10)</h3>
          <p>Распределение отмен по времени до отправления рейса</p>
        </div>
      </div>

      <div className="cancellation-progress-stacked">
        {categories.map((cat) => (
          <div
            key={cat.timing}
            className="stacked-slice"
            style={{
              width: `${cat.percentage}%`,
              backgroundColor: cat.color,
            }}
            title={`${cat.timing}: ${cat.percentage}%`}
          />
        ))}
      </div>

      <div className="cancellation-list">
        {categories.map((cat) => (
          <div key={cat.timing} className="cancellation-item">
            <div className="cancellation-item__header">
              <span
                className="category-marker"
                style={{ backgroundColor: cat.color }}
              />
              <strong>{cat.timing}</strong>
              <span className="cat-count">
                {cat.count} отмен ({cat.percentage}%)
              </span>
            </div>
            <small className="refund-rule-hint">Условие: {cat.refundPolicy}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
