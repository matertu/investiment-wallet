from fastapi import APIRouter, HTTPException, status

from app.schemas.carteira import CarteiraResponse
from app.services import carteira_service

router = APIRouter(tags=["Carteira"])


@router.get("/carteira", response_model=CarteiraResponse)
def get_carteira() -> CarteiraResponse:
    try:
        return carteira_service.obter_carteira()
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
