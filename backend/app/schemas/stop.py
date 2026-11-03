from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class StopResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stop_code: Optional[str] = None
    name: str
    latitude: float
    longitude: float
    zone: Optional[str] = None
    subzone: Optional[str] = None
    service_active: bool
    is_drt_hub: bool
    transport_type: Optional[str] = None
    has_pavilion: bool
    operating_org: Optional[str] = None
    electrification: Optional[str] = None


class StopShort(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float
    longitude: float


class StopListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[StopResponse]
