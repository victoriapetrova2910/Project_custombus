type KPIData = {
  totalPreorders: number;
  completedTrips: number;
  cancelledTrips: number;
  noShowCount: number;
  avgFleetLoad: number;
};

const number = new Intl.NumberFormat("ru-RU");
const percent = new Intl.NumberFormat("ru-RU", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default function KPI({ data }: { data: KPIData }) {
  function share(value: number) {
    return data.totalPreorders > 0
      ? `${percent.format(value / data.totalPreorders)} от предзаказов`
      : "Нет предзаказов";
  }

  const metrics = [
    ["Предзаказы", number.format(data.totalPreorders), "Всего оформлено"],
    ["Выполнено", number.format(data.completedTrips), share(data.completedTrips)],
    ["Отмены", number.format(data.cancelledTrips), share(data.cancelledTrips)],
    ["Неявки", number.format(data.noShowCount), share(data.noShowCount)],
    ["Загрузка мест", percent.format(data.avgFleetLoad / 100), "Средняя по парку"],
  ];

  return (
    <dl className="kpi-grid" aria-label="Ключевые показатели">
      {metrics.map(([label, value, detail]) => (
        <div className="kpi-card" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
          <dd className="kpi-card__detail">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}