from typing import Any

from app.core.enums import ClasseAtivo
from app.repositories import aporte_repository, ativo_repository
from app.schemas.aporte import AporteInput


def listar_aportes() -> list[dict[str, Any]]:
    return aporte_repository.listar_aportes()


def _preparar_dados_aporte(payload: AporteInput) -> dict[str, Any]:
    ativo = ativo_repository.buscar_ativo_por_id(payload.ativo_id)
    if ativo is None:
        raise LookupError(f"Ativo com id {payload.ativo_id} não encontrado.")

    quantidade = (
        1.0
        if ativo.get("classe") == ClasseAtivo.RENDA_FIXA.value
        else payload.quantidade
    )

    dados: dict[str, Any] = {
        "ativo_id": payload.ativo_id,
        "tipo": payload.tipo.value,
        "quantidade": quantidade,
        "valor_unitario": payload.valor_unitario,
    }
    if payload.data_aporte is not None:
        dados["data_aporte"] = payload.data_aporte.isoformat()

    return dados


def criar_aporte(payload: AporteInput) -> dict[str, Any]:
    dados = _preparar_dados_aporte(payload)
    return aporte_repository.inserir_aporte(dados)


def atualizar_aporte(aporte_id: int, payload: AporteInput) -> dict[str, Any]:
    existente = aporte_repository.buscar_aporte_por_id(aporte_id)
    if existente is None:
        raise LookupError(f"Aporte com id {aporte_id} não encontrado.")

    dados = _preparar_dados_aporte(payload)
    atualizado = aporte_repository.atualizar_aporte(aporte_id, dados)
    if atualizado is None:
        raise LookupError(f"Aporte com id {aporte_id} não encontrado.")

    return atualizado


def deletar_aporte(aporte_id: int) -> dict[str, Any]:
    removido = aporte_repository.deletar_aporte(aporte_id)
    if removido is None:
        raise LookupError(f"Aporte com id {aporte_id} não encontrado.")

    return removido
