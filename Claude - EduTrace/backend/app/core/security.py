"""
Seguridad mínima del MVP.

- Contraseñas: se guardan con hash PBKDF2-SHA256 y sal aleatoria (biblioteca estándar, sin dependencias).
- Sesión: token opaco aleatorio (NO es JWT). El backend guarda token → usuario en memoria.
  Cuando se pase a JWT, solo cambian `generar_token` y la validación en auth_service.
"""
import hashlib
import hmac
import secrets

_ITERACIONES = 100_000


def hashear_clave(clave: str) -> str:
    sal = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal, _ITERACIONES)
    return f"{sal.hex()}${digest.hex()}"


def verificar_clave(clave: str, guardado: str) -> bool:
    sal_hex, digest_hex = guardado.split("$", 1)
    calculado = hashlib.pbkdf2_hmac("sha256", clave.encode(), bytes.fromhex(sal_hex), _ITERACIONES)
    return hmac.compare_digest(calculado.hex(), digest_hex)  # comparación en tiempo constante


def generar_token() -> str:
    return secrets.token_urlsafe(32)


def extraer_token_bearer(authorization: str | None) -> str | None:
    """'Bearer abc123' → 'abc123'. Cualquier otra cosa → None."""
    if not authorization:
        return None
    tipo, _, token = authorization.partition(" ")
    return token.strip() if tipo.lower() == "bearer" and token.strip() else None
