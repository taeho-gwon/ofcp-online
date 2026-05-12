from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql+asyncpg://ofcp:ofcp@localhost:5432/ofcp"
    allowed_origins: list[str] = ["http://localhost:5173"]
    # 게임 state의 Redis TTL(초). save마다 갱신되어 활성 게임은 유지됨.
    game_ttl_seconds: int = 3600

    # JWT
    jwt_secret: str = "dev-secret-change-in-prod-not-for-real-use"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_seconds: int = 1800  # 30분
    jwt_refresh_ttl_seconds: int = 1209600  # 14일
    jwt_signup_ttl_seconds: int = 600  # 10분

    # Google OAuth
    google_client_id: str = ""


settings = Settings()
