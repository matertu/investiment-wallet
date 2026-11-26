import requests

from app.core.config import settings

BRAPI_BASE_URL: str = "https://brapi.dev/api/quote"
REQUEST_TIMEOUT_SECONDS: int = 5


def buscar_cotacao(ticker: str) -> float:
    """Consulta a cotação atual (regularMarketPrice) de um ativo na brapi.dev.

    Retorna 0.0 em caso de ticker inválido, erro HTTP, erro de rede ou timeout.
    """
    ticker_limpo = ticker.strip().upper()
    if not ticker_limpo:
        return 0.0

    url = f"{BRAPI_BASE_URL}/{ticker_limpo}"
    headers = {"Authorization": f"Bearer {settings.brapi_token}"}

    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()

        results = payload.get("results")
        if not isinstance(results, list) or not results:
            return 0.0

        price = results[0].get("regularMarketPrice")
        if price is None:
            return 0.0

        return float(price)
    except (requests.RequestException, ValueError, TypeError, KeyError):
        return 0.0
