from typing import Any

from app.core.database import supabase


def consultar_vw_renda_variavel() -> list[dict[str, Any]]:
    response = supabase.table("vw_renda_variavel").select("*").execute()
    return response.data or []


def consultar_vw_renda_fixa() -> list[dict[str, Any]]:
    response = supabase.table("vw_renda_fixa").select("*").execute()
    return response.data or []


def listar_aportes() -> list[dict[str, Any]]:
    response = (
        supabase.table("aportes")
        .select("*, ativos(codigo, nome, classe)")
        .order("data_aporte", desc=True)
        .order("id", desc=True)
        .execute()
    )
    return response.data or []


def buscar_aporte_por_id(aporte_id: int) -> dict[str, Any] | None:
    response = (
        supabase.table("aportes")
        .select("*, ativos(codigo, nome, classe)")
        .eq("id", aporte_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def inserir_aporte(dados: dict[str, Any]) -> dict[str, Any]:
    response = supabase.table("aportes").insert(dados).execute()
    return response.data[0]


def atualizar_aporte(
    aporte_id: int,
    dados: dict[str, Any],
) -> dict[str, Any] | None:
    response = (
        supabase.table("aportes")
        .update(dados)
        .eq("id", aporte_id)
        .execute()
    )
    return response.data[0] if response.data else None


def deletar_aporte(aporte_id: int) -> dict[str, Any] | None:
    response = (
        supabase.table("aportes")
        .delete()
        .eq("id", aporte_id)
        .execute()
    )
    return response.data[0] if response.data else None
