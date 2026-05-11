from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    redis_url: str = "redis://localhost:6379"
    allowed_origins: list[str] = ["http://localhost:5173"]
    # 게임 state의 Redis TTL(초). save마다 갱신되어 활성 게임은 유지됨.
    game_ttl_seconds: int = 3600


settings = Settings()
