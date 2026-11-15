from fastapi import APIRouter

from contracts.models import Envelope

router = APIRouter()


@router.get("/health", response_model=Envelope[dict])
def health() -> Envelope[dict]:
    return Envelope(ok=True, data={"status": "ok"})
