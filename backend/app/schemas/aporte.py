from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import TipoOperacao


class AporteInput(BaseModel):
    ativo_id: int = Field(..., gt=0)
    tipo: TipoOperacao = TipoOperacao.APORTE
    quantidade: float = Field(..., gt=0)
    valor_unitario: float = Field(..., gt=0)
    data_aporte: date | None = None


class AporteOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    id: int
    ativo_id: int
    tipo: TipoOperacao
    quantidade: float
    valor_unitario: float
    data_aporte: date
