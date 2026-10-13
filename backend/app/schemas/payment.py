
from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    preorder_id: int = Field(gt=0)
    amount: float = Field(gt=0)


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preorder_id: int
    amount: float
    status: str
