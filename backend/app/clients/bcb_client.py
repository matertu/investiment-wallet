from datetime import date, datetime, timedelta
import time

import requests

from app.core.enums import IndexadorRF

BCB_SGS_URL: str = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados"
REQUEST_TIMEOUT_SECONDS: int = 8
CACHE_TTL_SECONDS: int = 3600

SERIE_POR_INDEXADOR: dict[IndexadorRF, int] = {
    IndexadorRF.CDI: 12,
    IndexadorRF.SELIC: 11,
    IndexadorRF.IPCA: 433,
}

# Cache em memória: (serie, data_inicial, data_final) -> (timestamp, registros)
_cache_series: dict[tuple[int, date, date], tuple[float, list[tuple[date, float]]]] = {}


def _formatar_data_bcb(valor: date) -> str:
    return valor.strftime("%d/%m/%Y")


def _buscar_bloco_bcb(
    serie: int,
    data_inicial: date,
    data_final: date,
) -> list[tuple[date, float]] | None:
    url = BCB_SGS_URL.format(serie=serie)
    params = {
        "formato": "json",
        "dataInicial": _formatar_data_bcb(data_inicial),
        "dataFinal": _formatar_data_bcb(data_final),
    }
    headers = {
        "Accept": "application/json",
        "User-Agent": "carteira-investimentos/1.0",
    }

    try:
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            return None

        registros: list[tuple[date, float]] = []
        for item in payload:
            data_str = item.get("data")
            valor_str = item.get("valor")
            if not data_str or valor_str is None:
                continue
            dt = datetime.strptime(data_str, "%d/%m/%Y").date()
            val = float(str(valor_str).replace(",", "."))
            registros.append((dt, val))

        return registros
    except (requests.RequestException, ValueError, TypeError, KeyError):
        return None


def buscar_serie_bcb(
    serie: int,
    data_inicial: date,
    data_final: date | None = None,
) -> list[tuple[date, float]] | None:
    """Consulta uma série histórica no SGS do Banco Central com cache em memória.

    Retorna lista de (data, valor_percentual) ou None em caso de erro de rede/API.
    """
    fim = data_final or date.today()
    if data_inicial > fim:
        return []

    cache_key = (serie, data_inicial, fim)
    agora = time.monotonic()
    cached = _cache_series.get(cache_key)
    if cached is not None and (agora - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    # API do BCB limita consultas diárias a janelas de até 10 anos por requisição
    todos_registros: list[tuple[date, float]] = []
    inicio_bloco = data_inicial
    max_dias_bloco = 3650

    while inicio_bloco <= fim:
        fim_bloco = min(fim, inicio_bloco + timedelta(days=max_dias_bloco))
        bloco = _buscar_bloco_bcb(serie, inicio_bloco, fim_bloco)
        if bloco is None:
            return None
        todos_registros.extend(bloco)
        inicio_bloco = fim_bloco + timedelta(days=1)

    _cache_series[cache_key] = (agora, todos_registros)
    return todos_registros


def calcular_fator_acumulado_rf(
    indexador: IndexadorRF,
    taxa_percentual: float,
    data_inicial: date,
    data_final: date | None = None,
) -> float | None:
    """Calcula o fator de rendimento acumulado entre data_inicial e data_final.

    - CDI / SELIC: juros compostos diários multiplicados por (taxa_percentual / 100).
    - IPCA: variação mensal do IPCA acumulada * taxa fixa anual (taxa_percentual% a.a.).
    - PREFIXADO: taxa fixa anual (taxa_percentual% a.a.) em dias corridos.

    Retorna None se a consulta ao Banco Central falhar.
    """
    fim = data_final or date.today()
    dias_corridos = (fim - data_inicial).days
    if dias_corridos <= 0:
        return 1.0

    if indexador == IndexadorRF.PREFIXADO:
        return (1.0 + (taxa_percentual / 100.0)) ** (dias_corridos / 365.0)

    serie = SERIE_POR_INDEXADOR.get(indexador)
    if serie is None:
        return None

    registros = buscar_serie_bcb(serie, data_inicial, fim)
    if registros is None:
        return None

    if indexador in (IndexadorRF.CDI, IndexadorRF.SELIC):
        multiplicador = taxa_percentual / 100.0
        fator = 1.0
        for dt, taxa_dia in registros:
            if dt >= data_inicial:
                fator *= 1.0 + (taxa_dia / 100.0) * multiplicador
        return fator

    if indexador == IndexadorRF.IPCA:
        fator_ipca = 1.0
        for dt, taxa_mes in registros:
            if dt >= data_inicial.replace(day=1):
                fator_ipca *= 1.0 + (taxa_mes / 100.0)
        fator_prefixado = (1.0 + (taxa_percentual / 100.0)) ** (dias_corridos / 365.0)
        return fator_ipca * fator_prefixado

    return None
