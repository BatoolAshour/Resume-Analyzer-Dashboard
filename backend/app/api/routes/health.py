from fastapi import APIRouter, Depends

from app.api.deps import get_llm_client
from app.config import ALLOWED_EXTENSIONS, APP_VERSION, Settings, get_settings
from app.schemas.analysis import HealthResponse, UploadLimits
from app.services.llm import LLMClient

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(
    settings: Settings = Depends(get_settings),
    llm: LLMClient = Depends(get_llm_client),
) -> HealthResponse:
    """Liveness check. Reports whether an API key is set, never the key itself."""
    return HealthResponse(
        version=APP_VERSION,
        llm_configured=llm.configured,
        model=settings.groq_model,
        limits=UploadLimits(
            max_upload_mb=settings.max_upload_mb,
            allowed_extensions=list(ALLOWED_EXTENSIONS),
        ),
    )
