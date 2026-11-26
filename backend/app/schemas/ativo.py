from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ClasseAtivo, IndexadorRF


class NovoAtivoInput(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=30)
    nome: str = Field(..., min_length=1, max_length=100)
    classe: ClasseAtivo
    indexador: IndexadorRF | None = None
    taxa_percentual: float | None = Field(default=None, ge=0)
    valor_atual: float = Field(default=0.0, ge=0)


class AtualizaSaldoRFInput(BaseModel):
    valor_atual: float = Field(..., ge=0)


class AtivoOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    id: int
    codigo: str
    nome: str
    classe: ClasseAtivo
