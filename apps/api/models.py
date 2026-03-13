from datetime import datetime
from enum import StrEnum
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, Relationship, SQLModel


class EntityType(StrEnum):
    PLAYER_SHIP = "player_ship"
    FREIGHTER = "freighter"
    LINER = "liner"
    PATROL = "patrol"
    PIRATE = "pirate"
    CONVOY = "convoy"


class EventType(StrEnum):
    PREY_SPAWN = "prey_spawn"
    PREY_MOVE = "prey_move"
    PIRATE_ATTACK = "pirate_attack"
    RANDOM_EVENT = "random_event"
    DOOM_UPDATE = "doom_update"


class Campaign(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    current_tick: int = Field(default=0)
    current_date_imperial: str = Field(default="1105-001")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    entities: list["Entity"] = Relationship(back_populates="campaign")
    events: list["GameEvent"] = Relationship(back_populates="campaign")
    doom_clock: Optional["DoomClock"] = Relationship(back_populates="campaign")


class Entity(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    campaign_id: str = Field(foreign_key="campaign.id")
    name: str
    entity_type: EntityType
    hex_col: int
    hex_row: int
    token_svg_id: str = Field(default="freighter")
    visible_to_players: bool = Field(default=True)

    campaign: Campaign = Relationship(back_populates="entities")


class GameEvent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    campaign_id: str = Field(foreign_key="campaign.id")
    event_type: EventType
    tick: int
    description: str
    hex_col: Optional[int] = None
    hex_row: Optional[int] = None
    visible_to_players: bool = Field(default=True)
    metadata_json: str = Field(default="{}")

    campaign: Campaign = Relationship(back_populates="events")


class DoomClock(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    campaign_id: str = Field(foreign_key="campaign.id", unique=True)
    pri: int = Field(default=0)
    aslan_heat: int = Field(default=0)
    imperium_heat: int = Field(default=0)
    thresholds_json: str = Field(default="{}")

    campaign: Campaign = Relationship(back_populates="doom_clock")
