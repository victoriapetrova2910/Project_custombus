
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Trip
from app.schemas.trip import TripCreate, TripResponse

router = APIRouter(prefix="/api/v1/trips", tags=["Рейсы"])


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(trip_data: TripCreate, db: Session = Depends(get_db)):
    trip = Trip(
        departure_point=trip_data.departure_point,
        destination_point=trip_data.destination_point,
        departure_time=trip_data.departure_time,
        total_seats=trip_data.total_seats,
        available_seats=trip_data.total_seats,
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)

    return trip


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Рейс не найден",
        )

    return trip
