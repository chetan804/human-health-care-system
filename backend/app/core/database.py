from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings


@lru_cache
def engine():
    return create_engine(
        settings().database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=10,
        connect_args={"connect_timeout": 5},
    )


@lru_cache
def session_factory():
    return sessionmaker(engine(), expire_on_commit=False)
