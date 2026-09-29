from alembic import context
from sqlalchemy import create_engine
from backend.app.core.config import settings
from backend.app.models.entities import Base
from backend.app.models.patient_history import PatientProfileVersion  # noqa: F401 -- register metadata
from backend.app.models.governance import ModelVersion, PredictionRequest  # noqa: F401 -- register metadata

import backend.app.models.operations  # noqa: F401 -- register metadata

import backend.app.models.documents  # noqa: F401 -- register metadata

target_metadata = Base.metadata


def offline():
    context.configure(
        url=settings().database_url, target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()


def online():
    engine = create_engine(settings().database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    offline()
else:
    online()
