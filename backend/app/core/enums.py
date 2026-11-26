from enum import Enum


class ClasseAtivo(str, Enum):
    ACAO = "ACAO"
    FII = "FII"
    ETF = "ETF"
    RENDA_FIXA = "RENDA_FIXA"


class IndexadorRF(str, Enum):
    CDI = "CDI"
    SELIC = "SELIC"
    IPCA = "IPCA"
    PREFIXADO = "PREFIXADO"


class TipoOperacao(str, Enum):
    APORTE = "APORTE"
    RESGATE = "RESGATE"
