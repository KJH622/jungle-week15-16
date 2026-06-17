import os
import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv(encoding="utf-8")

security = HTTPBearer(auto_error=False)
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("jwt.secret")
JWT_ALGORITHMS = {
    "HS256": hashlib.sha256,
    "HS384": hashlib.sha384,
    "HS512": hashlib.sha512,
}


@dataclass
class CurrentUser:
    email: str


def _decode_base64url(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _decode_json(value: str) -> dict:
    return json.loads(_decode_base64url(value))


def _verify_jwt(token: str) -> dict:
    try:
        header_part, payload_part, signature_part = token.split(".")
        header = _decode_json(header_part)
        payload = _decode_json(payload_part)
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰 형식입니다.",
        ) from None

    algorithm = header.get("alg")
    digest = JWT_ALGORITHMS.get(algorithm)
    if digest is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="지원하지 않는 JWT 서명 알고리즘입니다.",
        )

    signing_input = f"{header_part}.{payload_part}".encode("utf-8")
    expected_signature = hmac.new(
        JWT_SECRET.encode("utf-8"),
        signing_input,
        digest,
    ).digest()
    actual_signature = _decode_base64url(signature_part)

    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰 서명입니다.",
        )

    exp = payload.get("exp")
    if exp is not None and time.time() >= float(exp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="만료된 토큰입니다.",
        )

    return payload


def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 필요합니다.",
        )

    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET 설정이 필요합니다.",
        )

    payload = _verify_jwt(credentials.credentials)

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에서 사용자 정보를 찾을 수 없습니다.",
        )

    return CurrentUser(email=email)
