from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    oracle_host: str
    oracle_port: int = 1521
    oracle_user: str
    oracle_password: str
    oracle_service: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    port: int = 3004
    app_env: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
