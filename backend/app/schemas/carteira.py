from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ClasseAtivo, IndexadorRF, TipoOperacao


class ItemRendaVariavel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    ativo_id: int
    codigo: str
    nome: str
    classe: ClasseAtivo
    quantidade_total: float
    preco_medio: float
    total_investido: float
    preco_atual: float
    total_atual: float
    rentabilidade_pct: float


class ItemRendaFixa(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    ativo_id: int
    codigo: str
    nome: str
    classe: ClasseAtivo = ClasseAtivo.RENDA_FIXA
    indexador: IndexadorRF
    taxa_percentual: float
    total_investido: float
    valor_atual: float
    rentabilidade_pct: float
    calculado_auto: bool = False


class AtivoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    codigo: str
    nome: str
    classe: ClasseAtivo


class AporteHistorico(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    id: int
    ativo_id: int
    tipo: TipoOperacao
    quantidade: float
    valor_unitario: float
    data_aporte: date
    ativos: AtivoResumo | None = None


class DestaqueAtivo(BaseModel):
    codigo: str
    rentabilidade_pct: float


class AporteMensal(BaseModel):
    mes: str
    total_aportado: float
    total_resgatado: float
    saldo_liquido: float


class PontoComparativoCDI(BaseModel):
    mes: str
    cdi_pct: float
    carteira_pct: float


class ResumoCarteira(BaseModel):
    patrimonio_total: float = 0.0
    total_aportado: float = 0.0
    lucro_prejuizo: float = 0.0
    rentabilidade_total_pct: float = 0.0
    total_rv: float = 0.0
    total_rf: float = 0.0
    pct_rv: float = 0.0
    pct_rf: float = 0.0
    maior_alta: DestaqueAtivo | None = None
    maior_queda: DestaqueAtivo | None = None
    alocacao_por_classe: dict[str, float] = Field(default_factory=dict)
    aportes_por_mes: list[AporteMensal] = Field(default_factory=list)
    comparativo_cdi: list[PontoComparativoCDI] = Field(default_factory=list)


class CarteiraResponse(BaseModel):
    resumo: ResumoCarteira = Field(default_factory=ResumoCarteira)
    renda_variavel: list[ItemRendaVariavel]
    renda_fixa: list[ItemRendaFixa]
    aportes: list[AporteHistorico]
