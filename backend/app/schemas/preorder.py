
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PreorderCreate(BaseModel):
    user_id: int = Field(gt=0)
    trip_id: int = Field(gt=0)
    seats_count: int = Field(default=1, ge=1)


class PreorderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    trip_id: Optional[int] = None
    departure_point: str
    destination_point: str
    departure_time: datetime
    seats_count: int
    status: str
    created_at: datetime
