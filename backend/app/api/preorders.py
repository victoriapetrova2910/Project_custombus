from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Payment, Preorder, Trip
from app.schemas.payment import PaymentResponse
from app.schemas.preorder import PreorderCreate, PreorderResponse

router = APIRouter(prefix="/api/v1/preorders", tags=["Бронирования"])
my_router = APIRouter(
    prefix="/api/v1/my",
    tags=["Мои бронирования"],
)


@router.post(
    "",
    response_model=PreorderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_preorder(
    preorder_data: PreorderCreate,
    db: Session = Depends(get_db),
):
    trip = (
        db.query(Trip)
        .filter(Trip.id == preorder_data.trip_id)
        .first()
    )

    if trip is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Рейс не найден",
        )

    result = db.execute(
        update(Trip)
        .where(
            Trip.id == preorder_data.trip_id,
            Trip.available_seats >= preorder_data.seats_count,
        )
        .values(
            available_seats=(
                Trip.available_seats - preorder_data.seats_count
            )
        )
    )

    if result.rowcount == 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Недостаточно свободных мест",
        )

    preorder = Preorder(
        user_id=preorder_data.user_id,
        trip_id=trip.id,
        departure_point=trip.departure_point,
        destination_point=trip.destination_point,
        departure_time=trip.departure_time,
        seats_count=preorder_data.seats_count,
        status="pending",
    )

    db.add(preorder)
    db.commit()
    db.refresh(preorder)

    return preorder


@router.post(
    "/{preorder_id}/pay",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def pay_preorder(
    preorder_id: int,
    db: Session = Depends(get_db),
):
    preorder = (
        db.query(Preorder)
        .filter(Preorder.id == preorder_id)
        .with_for_update()
        .first()
    )

    if preorder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )

    if preorder.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя оплатить отменённое бронирование",
        )

    if preorder.status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронирование уже оплачено",
        )

    payment = Payment(
        preorder_id=preorder.id,
        amount=500,
        status="pending",
    )

    db.add(payment)
    db.flush()

    payment.status = "paid"
    preorder.status = "confirmed"

    db.commit()
    db.refresh(payment)

    return payment


@router.get(
    "/{preorder_id}",
    response_model=PreorderResponse,
)
def get_preorder(
    preorder_id: int,
    db: Session = Depends(get_db),
):
    preorder = (
        db.query(Preorder)
        .filter(Preorder.id == preorder_id)
        .first()
    )

    if preorder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )

    return preorder



@router.post(
    "/{preorder_id}/cancel",
    response_model=PreorderResponse,
)
def cancel_preorder(
    preorder_id: int,
    db: Session = Depends(get_db),
):
    preorder = (
        db.query(Preorder)
        .filter(Preorder.id == preorder_id)
        .with_for_update()
        .first()
    )

    if preorder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )

    if preorder.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронирование уже отменено",
        )

    if preorder.trip_id is not None:
        trip = (
            db.query(Trip)
            .filter(Trip.id == preorder.trip_id)
            .with_for_update()
            .first()
        )

        if trip is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Рейс не найден",
            )

        if trip.available_seats + preorder.seats_count > trip.total_seats:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Нельзя вернуть места: превышено общее количество мест",
            )

        trip.available_seats += preorder.seats_count

    preorder.status = "cancelled"

    db.commit()
    db.refresh(preorder)

    return preorder


@my_router.get(
    "/preorders",
    response_model=list[PreorderResponse],
)
def get_my_preorders(
    user_id: int,
    db: Session = Depends(get_db),
):
    preorders = (
        db.query(Preorder)
        .filter(Preorder.user_id == user_id)
        .order_by(Preorder.created_at.desc())
        .all()
    )

    return preorders