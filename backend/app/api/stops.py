from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stop import StopListResponse, StopResponse
from app.services import stops as stops_service

router = APIRouter(prefix="/api/v1/stops", tags=["Остановки"])


@router.get("", response_model=StopListResponse)
def list_stops(
    q: Optional[str] = Query(None, description="Поиск по части названия"),
    zone: Optional[str] = Query(None, description="Округ: НАО, ТАО, Сколково"),
    subzone: Optional[str] = Query(None, description="Часть названия подзоны"),
    service_active: Optional[bool] = Query(
        None, description="Только остановки в действующей зоне «По пути»"
    ),
    is_drt_hub: Optional[bool] = Query(None, description="Только ключевые хабы"),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    radius_m: Optional[float] = Query(
        None, gt=0, le=50_000, description="Радиус от точки (lat, lon), метры"
    ),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    if (lat is None) != (lon is None):
        raise HTTPException(
            status_code=422,
            detail="Параметры lat и lon нужно передавать вместе",
        )
    if radius_m is not None and lat is None:
        raise HTTPException(
            status_code=422,
            detail="Для radius_m нужны lat и lon",
        )

    total, items = stops_service.list_stops(
        db,
        q=q,
        zone=zone,
        subzone=subzone,
        service_active=service_active,
        is_drt_hub=is_drt_hub,
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        limit=limit,
        offset=offset,
    )

    return StopListResponse(total=total, limit=limit, offset=offset, items=items)


@router.get("/{stop_id}", response_model=StopResponse)
def get_stop(stop_id: int, db: Session = Depends(get_db)):
    stop = stops_service.get_stop(db, stop_id)

    if stop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Остановка не найдена",
        )

    return stop
