from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.trip import (
    TripCreate,
    TripDetailResponse,
    TripResponse,
    TripSearchRequest,
    TripSearchResponse,
)
from app.services import trips as trip_service

router = APIRouter(prefix="/api/v1/trips", tags=["Рейсы"])
search_router = APIRouter(prefix="/api/v1/preorders", tags=["Бронирования"])


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(trip_data: TripCreate, db: Session = Depends(get_db)):
    try:
        return trip_service.create_trip(db, trip_data)
    except trip_service.TripServiceError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc


@router.get("", response_model=List[TripResponse])
def list_trips(
    from_stop_id: Optional[int] = Query(None, gt=0),
    to_stop_id: Optional[int] = Query(None, gt=0),
    on_date: Optional[date] = None,
    status: Optional[str] = None,
    available_only: bool = True,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    try:
        return trip_service.list_trips(
            db, from_stop_id=from_stop_id, to_stop_id=to_stop_id, on_date=on_date,
            status=status, available_only=available_only, limit=limit, offset=offset,
        )
    except trip_service.TripServiceError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc


@router.get("/{trip_id}", response_model=TripDetailResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = trip_service.get_trip_detail(db, trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Рейс не найден")
    return trip


@search_router.post("/search", response_model=TripSearchResponse)
def search_trips(request: TripSearchRequest, db: Session = Depends(get_db)):
    try:
        return trip_service.search_trips(db, request)
    except trip_service.TripServiceError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc
