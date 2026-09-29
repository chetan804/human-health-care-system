from dataclasses import dataclass
from uuid import UUID
from backend.app.core.errors import forbidden
from backend.app.services.policies import permits


@dataclass(frozen=True)
class Context:
    actor_id: UUID
    session_id: UUID
    facility_id: UUID
    organization_id: UUID
    roles: tuple[str, ...]
    request_id: str
    ip: str = ""
    user_agent: str = ""

    def require(self, permission):
        if not permits(self.roles, permission):
            forbidden()
