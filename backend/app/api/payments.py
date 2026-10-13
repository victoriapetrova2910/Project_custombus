
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Payment, Preorder
from app.schemas.payment import PaymentCreate, PaymentResponse


router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Оплата"],
)


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),):
    
    preorder = db.query(Preorder).filter(
        Preorder.id == payment_data.preorder_id
    ).first()

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
            detail="Бронирование уже оплачено",)

    existing_payment = db.query(Payment).filter(
        Payment.preorder_id == payment_data.preorder_id,
        Payment.status == "pending",).first()

    if existing_payment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Для этого бронирования уже существует ожидающий оплаты платёж",)

    payment = Payment(
        preorder_id=payment_data.preorder_id,
        amount=payment_data.amount,
        status="pending",
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id
    ).first()

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платёж не найден",
        )

    return payment


@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
def confirm_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .with_for_update()
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платёж не найден",
        )

    if payment.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Платёж уже подтверждён",
        )

    if payment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя подтвердить платёж с текущим статусом",
        )

    preorder = (
        db.query(Preorder)
        .filter(Preorder.id == payment.preorder_id)
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
            detail="Нельзя подтвердить оплату отменённого бронирования",
        )

    payment.status = "paid"
    preorder.status = "confirmed"

    db.commit()
    db.refresh(payment)

    return payment



@router.post("/{payment_id}/fail", response_model=PaymentResponse)
def fail_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .with_for_update()
        .first()
    )

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платёж не найден",
        )

    if payment.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отметить оплаченный платёж как неуспешный",
        )

    if payment.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Платёж уже отмечен как неуспешный",
        )

    payment.status = "failed"

    db.commit()
    db.refresh(payment)

    return payment


