import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from database import get_session
from models import Entity

router = APIRouter()


async def state_generator(
    request: Request,
    campaign_id: str,
    session: AsyncSession,
    filtered: bool,
) -> AsyncGenerator[str, None]:
    try:
        while True:
            if await request.is_disconnected():
                break
            result = await session.exec(
                select(Entity).where(Entity.campaign_id == campaign_id)
            )
            entities = list(result.all())
            if filtered:
                entities = [e for e in entities if e.visible_to_players]
            payload = {"entities": [e.model_dump() for e in entities]}
            yield f"event: state_update\ndata: {json.dumps(payload)}\n\n"
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        return


@router.get("/referee/{campaign_id}")
async def referee_stream(
    campaign_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    return StreamingResponse(
        state_generator(request, campaign_id, session, filtered=False),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


@router.get("/player/{campaign_id}")
async def player_stream(
    campaign_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    return StreamingResponse(
        state_generator(request, campaign_id, session, filtered=True),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
