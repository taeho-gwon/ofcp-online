from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings


class GoogleAuthError(Exception):
    pass


@dataclass
class GoogleIdentity:
    sub: str  # Google subject (영구 식별자)
    email: str


def verify_google_id_token(id_token: str) -> GoogleIdentity:
    """Google id_token 검증. 실패 시 GoogleAuthError."""
    if not settings.google_client_id:
        raise GoogleAuthError("google_client_id가 설정되지 않았습니다.")
    try:
        info = google_id_token.verify_oauth2_token(
            id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise GoogleAuthError(str(exc)) from exc

    sub = info.get("sub")
    email = info.get("email")
    if not sub or not email:
        raise GoogleAuthError("Google 토큰에 sub/email이 없습니다.")
    return GoogleIdentity(sub=sub, email=email)
