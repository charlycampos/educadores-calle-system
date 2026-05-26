from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    oracle_host: str
    oracle_port: int = 1521
    oracle_user: str
    oracle_password: str
    oracle_service: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    port: int = 3001
    app_env: str = "development"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
