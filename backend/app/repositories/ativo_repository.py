from datetime import datetime, timezone
from typing import Any

from app.core.database import supabase


def listar_ativos() -> list[dict[str, Any]]:
    response = supabase.table("ativos").select("*").order("codigo").execute()
    return response.data or []


def buscar_ativo_por_id(ativo_id: int) -> dict[str, Any] | None:
    response = (
        supabase.table("ativos")
        .select("*")
        .eq("id", ativo_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def buscar_ativo_por_codigo(codigo: str) -> dict[str, Any] | None:
    response = (
        supabase.table("ativos")
        .select("*")
        .eq("codigo", codigo)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def inserir_ativo(dados: dict[str, Any]) -> dict[str, Any]:
    response = supabase.table("ativos").insert(dados).execute()
    return response.data[0]


def inserir_detalhes_renda_fixa(dados: dict[str, Any]) -> dict[str, Any]:
    response = supabase.table("detalhes_renda_fixa").insert(dados).execute()
    return response.data[0]


def atualizar_valor_atual_rf(
    ativo_id: int,
    valor_atual: float,
) -> dict[str, Any] | None:
    response = (
        supabase.table("detalhes_renda_fixa")
        .update(
            {
                "valor_atual": valor_atual,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("ativo_id", ativo_id)
        .execute()
    )
    return response.data[0] if response.data else None
