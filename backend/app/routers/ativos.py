from typing import Any

from fastapi import APIRouter, HTTPException, status
from postgrest.exceptions import APIError

from app.schemas.ativo import AtualizaSaldoRFInput, NovoAtivoInput
from app.services import ativo_service
from app.services.ativo_service import ConflitoError

router = APIRouter(tags=["Ativos"])


@router.get("/ativos")
def get_ativos() -> list[dict[str, Any]]:
    return ativo_service.listar_ativos()


@router.post("/ativos", status_code=status.HTTP_201_CREATED)
def post_ativo(payload: NovoAtivoInput) -> dict[str, Any]:
    try:
        return ativo_service.criar_ativo(payload)
    except ConflitoError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except APIError as exc:
        if getattr(exc, "code", None) == "23505":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um ativo cadastrado com este código.",
            ) from exc
        raise


@router.patch("/renda-fixa/{ativo_id}")
def patch_saldo_renda_fixa(
    ativo_id: int,
    payload: AtualizaSaldoRFInput,
) -> dict[str, Any]:
    try:
        return ativo_service.atualizar_saldo_rf(ativo_id, payload)
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
