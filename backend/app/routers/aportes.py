from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from app.schemas.aporte import AporteInput
from app.services import aporte_service

router = APIRouter(tags=["Aportes"])


@router.post("/aportes", status_code=status.HTTP_201_CREATED)
def post_aporte(payload: AporteInput) -> dict[str, Any]:
    try:
        return aporte_service.criar_aporte(payload)
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


@router.put("/aportes/{aporte_id}")
def put_aporte(aporte_id: int, payload: AporteInput) -> dict[str, Any]:
    try:
        return aporte_service.atualizar_aporte(aporte_id, payload)
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


@router.delete("/aportes/{aporte_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_aporte(aporte_id: int) -> Response:
    try:
        aporte_service.deletar_aporte(aporte_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
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
