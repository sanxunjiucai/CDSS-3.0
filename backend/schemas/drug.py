from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DrugBase(BaseModel):
    name: str
    trade_name: Optional[str] = None
    category: Optional[str] = None


class DrugCreate(DrugBase):
    indications: Optional[str] = None
    dosage: Optional[str] = None
    contraindications: Optional[str] = None
    interactions: Optional[str] = None
    adverse_reactions: Optional[str] = None
    special_population: Optional[str] = None


class DrugUpdate(DrugCreate):
    name: Optional[str] = None


class DrugListItem(DrugBase):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class DrugDetail(DrugCreate):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}
