from typing import Any

from app.clients.bcb_client import (
    SERIE_POR_INDEXADOR,
    buscar_serie_bcb,
    calcular_fator_acumulado_rf,
    hoje_brasilia,
)
from app.clients.brapi_client import buscar_cotacao
from app.core.enums import ClasseAtivo, IndexadorRF, TipoOperacao
from app.repositories import aporte_repository
from app.schemas.carteira import (
    AporteHistorico,
    AporteMensal,
    CarteiraResponse,
    DestaqueAtivo,
    ItemRendaFixa,
    ItemRendaVariavel,
    PontoComparativoCDI,
    ResumoCarteira,
)


def _calcular_rentabilidade_pct(total_investido: float, total_atual: float) -> float:
    if total_investido <= 0:
        return 0.0
    return round(((total_atual - total_investido) / total_investido) * 100, 2)


def _montar_item_renda_variavel(row: dict[str, Any]) -> ItemRendaVariavel:
    ativo_id = int(row.get("ativo_id") or row.get("id") or 0)
    codigo = str(row["codigo"])
    nome = str(row["nome"])
    classe = row["classe"]

    quantidade_total = float(
        row.get("quantidade_total")
        if row.get("quantidade_total") is not None
        else row.get("quantidade", 0.0)
    )
    preco_medio = float(row.get("preco_medio") or 0.0)
    total_investido = float(
        row.get("total_investido")
        if row.get("total_investido") is not None
        else row.get("valor_investido", quantidade_total * preco_medio)
    )

    preco_atual = buscar_cotacao(codigo)
    total_atual = round(quantidade_total * preco_atual, 2)
    rentabilidade_pct = _calcular_rentabilidade_pct(total_investido, total_atual)

    return ItemRendaVariavel(
        ativo_id=ativo_id,
        codigo=codigo,
        nome=nome,
        classe=classe,
        quantidade_total=round(quantidade_total, 6),
        preco_medio=round(preco_medio, 4),
        total_investido=round(total_investido, 2),
        preco_atual=round(preco_atual, 2),
        total_atual=total_atual,
        rentabilidade_pct=rentabilidade_pct,
    )


def _calcular_valor_atual_rf_auto(
    indexador: IndexadorRF,
    taxa_percentual: float,
    aportes_ativo: list[AporteHistorico],
) -> float | None:
    if not aportes_ativo:
        return None

    hoje = hoje_brasilia()
    valor_acumulado = 0.0

    for aporte in aportes_ativo:
        fator = calcular_fator_acumulado_rf(
            indexador=indexador,
            taxa_percentual=taxa_percentual,
            data_inicial=aporte.data_aporte,
            data_final=hoje,
        )
        if fator is None:
            return None

        valor_mov = float(aporte.quantidade) * float(aporte.valor_unitario)
        if aporte.tipo == TipoOperacao.RESGATE:
            valor_acumulado -= valor_mov * fator
        else:
            valor_acumulado += valor_mov * fator

    return round(max(valor_acumulado, 0.0), 2)


def _montar_item_renda_fixa(
    row: dict[str, Any],
    aportes_ativo: list[AporteHistorico],
) -> ItemRendaFixa:
    ativo_id = int(row.get("ativo_id") or row.get("id") or 0)
    indexador = IndexadorRF(row["indexador"])
    taxa_percentual = float(row.get("taxa_percentual") or 0.0)
    total_investido = float(
        row.get("total_investido")
        if row.get("total_investido") is not None
        else row.get("valor_investido", 0.0)
    )

    valor_manual = float(row.get("valor_atual") or 0.0)
    valor_auto = _calcular_valor_atual_rf_auto(
        indexador=indexador,
        taxa_percentual=taxa_percentual,
        aportes_ativo=aportes_ativo,
    )

    if valor_auto is not None:
        valor_atual = valor_auto
        calculado_auto = True
    elif valor_manual > 0:
        valor_atual = valor_manual
        calculado_auto = False
    else:
        valor_atual = total_investido
        calculado_auto = False

    rentabilidade_pct = _calcular_rentabilidade_pct(total_investido, valor_atual)

    return ItemRendaFixa(
        ativo_id=ativo_id,
        codigo=str(row["codigo"]),
        nome=str(row["nome"]),
        classe=row.get("classe") or ClasseAtivo.RENDA_FIXA,
        indexador=indexador,
        taxa_percentual=taxa_percentual,
        total_investido=round(total_investido, 2),
        valor_atual=round(valor_atual, 2),
        rentabilidade_pct=rentabilidade_pct,
        calculado_auto=calculado_auto,
    )


def _calcular_aportes_por_mes(aportes: list[AporteHistorico]) -> list[AporteMensal]:
    agrupado: dict[str, dict[str, float]] = {}

    for item in aportes:
        mes = item.data_aporte.strftime("%Y-%m")
        bucket = agrupado.setdefault(mes, {"aportado": 0.0, "resgatado": 0.0})
        valor = float(item.quantidade) * float(item.valor_unitario)
        if item.tipo == TipoOperacao.RESGATE:
            bucket["resgatado"] += valor
        else:
            bucket["aportado"] += valor

    resultado: list[AporteMensal] = []
    for mes in sorted(agrupado.keys()):
        aportado = round(agrupado[mes]["aportado"], 2)
        resgatado = round(agrupado[mes]["resgatado"], 2)
        resultado.append(
            AporteMensal(
                mes=mes,
                total_aportado=aportado,
                total_resgatado=resgatado,
                saldo_liquido=round(aportado - resgatado, 2),
            )
        )
    return resultado


def _calcular_comparativo_cdi(
    aportes: list[AporteHistorico],
    rentabilidade_total_pct: float,
) -> list[PontoComparativoCDI]:
    if not aportes:
        return []

    primeira_data = min(item.data_aporte for item in aportes)
    hoje = hoje_brasilia()
    if primeira_data >= hoje:
        mes_atual = hoje.strftime("%Y-%m")
        return [
            PontoComparativoCDI(
                mes=mes_atual,
                cdi_pct=0.0,
                carteira_pct=round(rentabilidade_total_pct, 2),
            )
        ]

    registros_cdi = buscar_serie_bcb(
        SERIE_POR_INDEXADOR[IndexadorRF.CDI],
        primeira_data,
        hoje,
    )
    if not registros_cdi:
        return [
            PontoComparativoCDI(
                mes=hoje.strftime("%Y-%m"),
                cdi_pct=0.0,
                carteira_pct=round(rentabilidade_total_pct, 2),
            )
        ]

    fator_por_mes: dict[str, float] = {}
    fator_acumulado = 1.0
    for dt, taxa_dia in registros_cdi:
        if dt >= primeira_data:
            fator_acumulado *= 1.0 + (taxa_dia / 100.0)
            fator_por_mes[dt.strftime("%Y-%m")] = fator_acumulado

    meses = sorted(fator_por_mes.keys())
    if not meses:
        return []

    total_passos = max(len(meses) - 1, 1)
    pontos: list[PontoComparativoCDI] = []
    for idx, mes in enumerate(meses):
        cdi_pct = round((fator_por_mes[mes] - 1.0) * 100, 2)
        progresso = idx / total_passos if len(meses) > 1 else 1.0
        carteira_pct = round(rentabilidade_total_pct * progresso, 2)
        pontos.append(
            PontoComparativoCDI(
                mes=mes,
                cdi_pct=cdi_pct,
                carteira_pct=carteira_pct,
            )
        )

    return pontos


def _montar_resumo(
    renda_variavel: list[ItemRendaVariavel],
    renda_fixa: list[ItemRendaFixa],
    aportes: list[AporteHistorico],
) -> ResumoCarteira:
    total_rv = round(sum(item.total_atual for item in renda_variavel), 2)
    total_rf = round(sum(item.valor_atual for item in renda_fixa), 2)
    patrimonio_total = round(total_rv + total_rf, 2)

    total_aportado_rv = sum(item.total_investido for item in renda_variavel)
    total_aportado_rf = sum(item.total_investido for item in renda_fixa)
    total_aportado = round(total_aportado_rv + total_aportado_rf, 2)

    lucro_prejuizo = round(patrimonio_total - total_aportado, 2)
    rentabilidade_total_pct = _calcular_rentabilidade_pct(
        total_aportado, patrimonio_total
    )

    pct_rv = round((total_rv / patrimonio_total) * 100, 1) if patrimonio_total > 0 else 0.0
    pct_rf = round((total_rf / patrimonio_total) * 100, 1) if patrimonio_total > 0 else 0.0

    # Alocação por classe
    alocacao: dict[str, float] = {}
    for item in renda_variavel:
        chave = item.classe.value
        alocacao[chave] = round(alocacao.get(chave, 0.0) + item.total_atual, 2)
    for item in renda_fixa:
        chave = item.classe.value
        alocacao[chave] = round(alocacao.get(chave, 0.0) + item.valor_atual, 2)

    # Maior alta e maior queda entre todos os ativos com valor investido > 0
    todos_ativos: list[DestaqueAtivo] = [
        DestaqueAtivo(codigo=i.codigo, rentabilidade_pct=i.rentabilidade_pct)
        for i in renda_variavel
        if i.total_investido > 0
    ] + [
        DestaqueAtivo(codigo=i.codigo, rentabilidade_pct=i.rentabilidade_pct)
        for i in renda_fixa
        if i.total_investido > 0
    ]

    maior_alta = (
        max(todos_ativos, key=lambda a: a.rentabilidade_pct) if todos_ativos else None
    )
    maior_queda = (
        min(todos_ativos, key=lambda a: a.rentabilidade_pct) if todos_ativos else None
    )

    aportes_por_mes = _calcular_aportes_por_mes(aportes)
    comparativo_cdi = _calcular_comparativo_cdi(aportes, rentabilidade_total_pct)

    return ResumoCarteira(
        patrimonio_total=patrimonio_total,
        total_aportado=total_aportado,
        lucro_prejuizo=lucro_prejuizo,
        rentabilidade_total_pct=rentabilidade_total_pct,
        total_rv=total_rv,
        total_rf=total_rf,
        pct_rv=pct_rv,
        pct_rf=pct_rf,
        maior_alta=maior_alta,
        maior_queda=maior_queda,
        alocacao_por_classe=alocacao,
        aportes_por_mes=aportes_por_mes,
        comparativo_cdi=comparativo_cdi,
    )


def obter_carteira() -> CarteiraResponse:
    rv_rows = aporte_repository.consultar_vw_renda_variavel()
    rf_rows = aporte_repository.consultar_vw_renda_fixa()
    aportes_rows = aporte_repository.listar_aportes()

    aportes = [AporteHistorico.model_validate(row) for row in aportes_rows]

    aportes_por_ativo: dict[int, list[AporteHistorico]] = {}
    for aporte in aportes:
        aportes_por_ativo.setdefault(aporte.ativo_id, []).append(aporte)

    renda_variavel = [_montar_item_renda_variavel(row) for row in rv_rows]
    renda_fixa = [
        _montar_item_renda_fixa(
            row,
            aportes_por_ativo.get(int(row.get("ativo_id") or row.get("id") or 0), []),
        )
        for row in rf_rows
    ]
    resumo = _montar_resumo(renda_variavel, renda_fixa, aportes)

    return CarteiraResponse(
        resumo=resumo,
        renda_variavel=renda_variavel,
        renda_fixa=renda_fixa,
        aportes=aportes,
    )
