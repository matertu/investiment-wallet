from typing import Any

from app.core.enums import ClasseAtivo
from app.repositories import ativo_repository
from app.schemas.ativo import AtualizaSaldoRFInput, NovoAtivoInput


class ConflitoError(ValueError):
    """Exceção de domínio para conflitos de unicidade (ex: código duplicado)."""


def listar_ativos() -> list[dict[str, Any]]:
    return ativo_repository.listar_ativos()


def criar_ativo(payload: NovoAtivoInput) -> dict[str, Any]:
    codigo = payload.codigo.strip().upper()
    nome = payload.nome.strip()

    if not codigo:
        raise ValueError("O código do ativo não pode ser vazio.")
    if not nome:
        raise ValueError("O nome do ativo não pode ser vazio.")

    if payload.classe == ClasseAtivo.RENDA_FIXA:
        if payload.indexador is None or payload.taxa_percentual is None:
            raise ValueError(
                "Ativos de RENDA_FIXA exigem 'indexador' e 'taxa_percentual'."
            )

    if ativo_repository.buscar_ativo_por_codigo(codigo) is not None:
        raise ConflitoError(
            f"Já existe um ativo cadastrado com o código '{codigo}'."
        )

    ativo = ativo_repository.inserir_ativo(
        {
            "codigo": codigo,
            "nome": nome,
            "classe": payload.classe.value,
        }
    )

    if payload.classe == ClasseAtivo.RENDA_FIXA:
        detalhes = ativo_repository.inserir_detalhes_renda_fixa(
            {
                "ativo_id": ativo["id"],
                "indexador": payload.indexador.value,  # type: ignore[union-attr]
                "taxa_percentual": payload.taxa_percentual,
                "valor_atual": payload.valor_atual,
            }
        )
        ativo["detalhes_renda_fixa"] = detalhes

    return ativo


def atualizar_saldo_rf(
    ativo_id: int,
    payload: AtualizaSaldoRFInput,
) -> dict[str, Any]:
    ativo = ativo_repository.buscar_ativo_por_id(ativo_id)
    if ativo is None:
        raise LookupError(f"Ativo com id {ativo_id} não encontrado.")

    if ativo.get("classe") != ClasseAtivo.RENDA_FIXA.value:
        raise ValueError(
            "Apenas ativos da classe RENDA_FIXA possuem saldo atualizável."
        )

    atualizado = ativo_repository.atualizar_valor_atual_rf(
        ativo_id=ativo_id,
        valor_atual=payload.valor_atual,
    )
    if atualizado is None:
        raise LookupError(
            f"Detalhes de renda fixa não encontrados para o ativo {ativo_id}."
        )

    return atualizado
