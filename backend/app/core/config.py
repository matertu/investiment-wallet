from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv

PROJECT_ROOT: Path = Path(__file__).resolve().parents[3]
ENV_PATH: Path = PROJECT_ROOT / ".env"

load_dotenv(dotenv_path=ENV_PATH)


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_key: str
    brapi_token: str


def load_settings() -> Settings:
    required_vars: tuple[str, ...] = ("SUPABASE_URL", "SUPABASE_KEY", "BRAPI_TOKEN")
    values: dict[str, str] = {}
    missing: list[str] = []

    for var in required_vars:
        value = os.getenv(var, "").strip()
        if not value:
            missing.append(var)
        else:
            values[var] = value

    if missing:
        missing_list = ", ".join(missing)
        raise ValueError(
            f"Variáveis de ambiente obrigatórias ausentes ou vazias: {missing_list}. "
            f"Verifique o arquivo {ENV_PATH}."
        )

    return Settings(
        supabase_url=values["SUPABASE_URL"],
        supabase_key=values["SUPABASE_KEY"],
        brapi_token=values["BRAPI_TOKEN"],
    )


settings: Settings = load_settings()
