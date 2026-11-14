type KPIData = {
  totalPreorders: number;
  completedTrips: number;
  cancelledTrips: number;
  noShowCount: number;
  avgFleetLoad: number; // В процентах, например 78%
};

type KPIProps = {
  data: KPIData;
};

export default function KPI({ data }: KPIProps) {
  const cancelRate =
    data.totalPreorders > 0
      ? ((data.cancelledTrips / data.totalPreorders) * 100).toFixed(1)
      : "0";

  const noShowRate =
    data.totalPreorders > 0
      ? ((data.noShowCount / data.totalPreorders) * 100).toFixed(1)
      : "0";

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--blue">📋</div>
        <div className="kpi-card__body">
          <small>Всего предзаказов</small>
          <strong>{data.totalPreorders.toLocaleString("ru-RU")}</strong>
          <span className="kpi-trend kpi-trend--up">↑ +14% к прошлой неделе</span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--green">✅</div>
        <div className="kpi-card__body">
          <small>Выполнено поездок</small>
          <strong>{data.completedTrips.toLocaleString("ru-RU")}</strong>
          <span className="kpi-trend kpi-trend--neutral">
            {data.totalPreorders > 0
              ? `${Math.round((data.completedTrips / data.totalPreorders) * 100)}% от общего числа`
              : "100%"}
          </span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--orange">↩️</div>
        <div className="kpi-card__body">
          <small>Отмены предзаказов</small>
          <strong>{data.cancelledTrips}</strong>
          <span className="kpi-trend kpi-trend--sub">
            Доля отмен: <strong>{cancelRate}%</strong>
          </span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--red">⚠️</div>
        <div className="kpi-card__body">
          <small>Неявки пассажиров (No-show)</small>
          <strong>{data.noShowCount}</strong>
          <span className="kpi-trend kpi-trend--sub">
            Уровень неявок: <strong>{noShowRate}%</strong>
          </span>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--yellow">🚐</div>
        <div className="kpi-card__body">
          <small>Средняя загрузка мест</small>
          <strong>{data.avgFleetLoad}%</strong>
          <span className="kpi-trend kpi-trend--up">План: 75% | Факт: {data.avgFleetLoad}%</span>
        </div>
      </div>
    </div>
  );
}
