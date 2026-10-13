
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TripCreate(BaseModel):
    departure_point: str = Field(min_length=1, max_length=255)
    destination_point: str = Field(min_length=1, max_length=255)
    departure_time: datetime
    total_seats: int = Field(gt=0)


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    departure_point: str
    destination_point: str
    departure_time: datetime
    total_seats: int
    available_seats: int
