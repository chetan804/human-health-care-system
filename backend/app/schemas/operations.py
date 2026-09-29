from typing import Literal, Annotated
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import Field, StringConstraints, field_validator
from backend.app.schemas.contracts import Strict, RoleName

Password = Annotated[str, StringConstraints(min_length=12, max_length=128, strip_whitespace=False)]


class ChallengeConsume(Strict):
    token: str = Field(min_length=32, max_length=128)


class PasswordReset(ChallengeConsume):
    new_password: Password


class PasswordProof(Strict):
    password: Annotated[
        str, StringConstraints(min_length=1, max_length=128, strip_whitespace=False)
    ]
    second_factor: str | None = Field(default=None, max_length=64)


class PasswordChange(PasswordProof):
    new_password: Password


class FactorCode(Strict):
    code: str = Field(pattern=r"^\d{6}$")


class FacilityInput(Strict):
    name: str = Field(min_length=2, max_length=160)
    timezone: str = Field(max_length=64)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, v):
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("IANA timezone required") from None
        return v


class DepartmentInput(Strict):
    name: str = Field(min_length=2, max_length=120)


class DepartmentUpdate(DepartmentInput):
    active: bool
    expected_version: int = Field(ge=1)


class StaffDepartmentInput(Strict):
    user_id: UUID
    department_id: UUID
    assigned: bool


class MembershipInput(Strict):
    user_id: UUID
    role: RoleName
    operation: Literal["GRANT", "REVOKE"]
    reason: str = Field(min_length=10, max_length=200)


class AccountState(Strict):
    active: bool
    reason: str = Field(min_length=10, max_length=200)


class OperationalValues(Strict):
    reminders_minutes: list[int] = Field(default=[1440], max_length=10)
    export_ttl_minutes: int = Field(default=15, ge=1, le=60)

    @field_validator("reminders_minutes")
    @classmethod
    def offsets(cls, values):
        if len(set(values)) != len(values) or any(v < 1 or v > 10080 for v in values):
            raise ValueError("Unique offsets within one week required")
        return values


class ConfigurationInput(OperationalValues):
    expected_version: int = Field(ge=0)


class HoldInput(Strict):
    reason: str = Field(min_length=10, max_length=2000)


class HoldRelease(HoldInput):
    expected_version: int = Field(ge=1)


class PreferenceInput(Strict):
    email_enabled: bool
    sms_enabled: bool
    expected_version: int = Field(ge=0)


class ImportInput(Strict):
    csv_text: str = Field(min_length=10, max_length=50000)


class ExportInput(Strict):
    purpose: str = Field(min_length=10, max_length=200)
