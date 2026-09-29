"""Strict runtime configuration. Production never receives generated default secrets."""

import os
from urllib.parse import urlsplit
from functools import lru_cache
from typing import Literal
from pydantic import SecretStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)
    app_env: Literal["development", "testing", "staging", "production"] = "development"
    database_url: str
    redis_url: str
    jwt_secret: SecretStr
    encryption_key: SecretStr | None = None
    document_storage_backend: Literal["unconfigured", "database-development"] = "unconfigured"
    encryption_backend: Literal["local-development", "unconfigured"] = "unconfigured"
    allowed_origins: list[str] = ["http://localhost:5173"]
    jwt_issuer: str = "hcs"
    jwt_audience: str = "hcs-api"
    access_seconds: int = Field(default=600, ge=60, le=3600)
    refresh_days: int = Field(default=7, ge=1, le=30)
    rate_limit: int = Field(default=120, ge=1, le=10000)
    login_limit: int = Field(default=10, ge=1, le=1000)
    reminders_minutes: list[int] = [1440]
    cookie_secure: bool = True

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, value: str) -> str:
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("PostgreSQL with psycopg is required")
        return value

    @field_validator("allowed_origins")
    @classmethod
    def exact_origins(cls, values):
        for value in values:
            parsed = urlsplit(value)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or "*" in value
                or parsed.username
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError("Origins must be explicit HTTP(S) scheme/host/port values")
        if not values:
            raise ValueError("An explicit browser origin allowlist is required")
        return values

    @field_validator("reminders_minutes")
    @classmethod
    def bounded_reminders(cls, values):
        if (
            len(values) > 10
            or len(set(values)) != len(values)
            or any(v < 1 or v > 10080 for v in values)
        ):
            raise ValueError("Reminder offsets must be unique values within one week")
        return values

    @model_validator(mode="after")
    def secure_settings(self):
        if len(self.jwt_secret.get_secret_value()) < 48:
            raise ValueError("JWT secret must contain at least 48 characters")
        if self.app_env in {"production", "staging"}:
            if self.document_storage_backend == "database-development":
                raise ValueError(
                    "Development document storage forbidden outside development/testing"
                )
            if self.encryption_backend == "local-development":
                raise ValueError("Local development keys are forbidden outside development/testing")
            if not self.cookie_secure:
                raise ValueError("Secure cookies required")
        if self.encryption_backend == "local-development" and not self.encryption_key:
            raise ValueError("Development wrapping key required")
        return self


@lru_cache
def settings() -> Settings:
    local = os.environ.get("APP_ENV", "development") in {"development", "testing"}
    return Settings(_env_file=".env" if local else None)
