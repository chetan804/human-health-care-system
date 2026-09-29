from datetime import date
from pydantic import Field, field_validator
from backend.app.schemas.contracts import Strict


class ModelRegistration(Strict):
    model_id: str = Field(min_length=1, max_length=100)
    version: str = Field(min_length=1, max_length=100)
    dataset_identifier: str = Field(min_length=1, max_length=200)
    training_date: date
    feature_schema: list[str] = Field(min_length=1, max_length=500)
    evaluation_metrics: dict[str, float] = Field(max_length=50)
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    limitations: str = Field(min_length=20, max_length=4000)
    intended_use: str = Field(min_length=20, max_length=4000)
    contraindicated_use: str = Field(min_length=20, max_length=4000)

    @field_validator("training_date")
    @classmethod
    def past_date(cls, value):
        if value > date.today():
            raise ValueError("Training date cannot be in the future")
        return value

    @field_validator("feature_schema")
    @classmethod
    def feature_names(cls, values):
        if any(not x.strip() or len(x) > 100 for x in values) or len(values) != len(set(values)):
            raise ValueError("Features must be unique bounded names")
        return values

    @field_validator("evaluation_metrics")
    @classmethod
    def finite_metrics(cls, values):
        import math

        if any(not math.isfinite(v) or len(k) > 100 for k, v in values.items()):
            raise ValueError("Metrics must be finite and keys bounded")
        return values
