from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from database import get_session
from models import Campaign, DoomClock

router = APIRouter()


@router.post("/", response_model=Campaign)
async def create_campaign(
    name: str,
    session: AsyncSession = Depends(get_session),
) -> Campaign:
    campaign = Campaign(name=name)
    doom = DoomClock(campaign_id=campaign.id)
    session.add(campaign)
    session.add(doom)
    await session.commit()
    await session.refresh(campaign)
    return campaign


@router.get("/", response_model=list[Campaign])
async def list_campaigns(
    session: AsyncSession = Depends(get_session),
) -> list[Campaign]:
    result = await session.exec(select(Campaign))
    return list(result.all())
