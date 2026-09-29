"""Scoped operator commands. No self-escalation, account verification override or clinical bypass."""

from sqlalchemy import exists, and_, update
from backend.app.core.database import session_factory
from backend.app.core.security import now
from backend.app.core.errors import AppError, forbidden, missing
from backend.app.models.entities import (
    User,
    Facility,
    Membership,
    Doctor,
    Session,
    Availability,
    Appointment,
)
from backend.app.models.operations import Department, StaffDepartment, FacilityConfiguration
from backend.app.repositories.store import Store
from backend.app.execution.healthcare import audit, replay, remember, doctor_access
from backend.app.schemas.operations import OperationalValues


def admin_scope(store, ctx, super_only=False):
    # Serializes membership/config changes with a fresh privilege check, not stale client claims.
    store.advisory_lock(f"facility-admin:{ctx.facility_id}")
    allowed = ["SUPER_ADMIN"] if super_only else ["ADMIN", "SUPER_ADMIN"]
    member = store.one(
        Membership,
        Membership.user_id == ctx.actor_id,
        Membership.facility_id == ctx.facility_id,
        Membership.role.in_(allowed),
    )
    user = store.get(User, ctx.actor_id)
    if not member or not user or not user.active or not user.verified:
        forbidden()
    if not store.one(
        Facility, Facility.id == ctx.facility_id, Facility.organization_id == ctx.organization_id
    ):
        forbidden()


def facilities(ctx, data=None, key=None):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx, super_only=data is not None)
        if data:
            previous, ns, hashed = replay(store, ctx, "facility.create", key, data.model_dump())
            if previous:
                return previous
            row = store.add(Facility(organization_id=ctx.organization_id, **data.model_dump()))
            store.add(Membership(user_id=ctx.actor_id, facility_id=row.id, role="SUPER_ADMIN"))
            audit(store, ctx, "facility.create", "facility", row.id)
            result = {"id": str(row.id), "name": row.name, "timezone": row.timezone}
            remember(store, ctx, "facility.create", key, ns, hashed, row.id, result)
            return result
        # Only facilities in which this actor actually holds an operator membership.
        scoped = exists().where(
            and_(
                Membership.facility_id == Facility.id,
                Membership.user_id == ctx.actor_id,
                Membership.role.in_(["ADMIN", "SUPER_ADMIN"]),
            )
        )
        audit(store, ctx, "facility.list", "facility")
        return {
            "items": [
                {"id": str(f.id), "name": f.name, "timezone": f.timezone}
                for f in store.list(
                    Facility, Facility.organization_id == ctx.organization_id, scoped, limit=100
                )
            ]
        }


def staff(ctx, page, size):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx)
        scope = exists().where(
            and_(
                Membership.user_id == User.id,
                Membership.facility_id == ctx.facility_id,
                Membership.role != "PATIENT",
            )
        )
        rows = store.list(User, scope, limit=size, offset=(page - 1) * size)
        result = []
        for user in rows:
            result.append(
                {
                    "id": str(user.id),
                    "display_name": user.display_name,
                    "email": user.email,
                    "active": user.active,
                    "verified": user.verified,
                    "roles": [
                        m.role
                        for m in store.list(
                            Membership,
                            Membership.user_id == user.id,
                            Membership.facility_id == ctx.facility_id,
                            limit=20,
                        )
                    ],
                }
            )
        audit(store, ctx, "staff.list", "facility", ctx.facility_id)
        return {"items": result, "total": store.count(User, scope), "page": page, "page_size": size}


def memberships(ctx, data, key):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx)
        if data.user_id == ctx.actor_id or data.role == "PATIENT":
            forbidden()
        privileged = store.one(
            Membership,
            Membership.user_id == data.user_id,
            Membership.facility_id == ctx.facility_id,
            Membership.role.in_(["ADMIN", "SUPER_ADMIN", "SYSTEM_AUDITOR"]),
        )
        if data.role in {"ADMIN", "SUPER_ADMIN", "SYSTEM_AUDITOR"} or privileged:
            admin_scope(store, ctx, super_only=True)
        user = store.get(User, data.user_id, lock=True)
        if not user or not user.active or not user.verified:
            missing()
        previous, ns, hashed = replay(
            store, ctx, "membership.change", key, data.model_dump(mode="json")
        )
        if previous:
            return previous
        member = store.one(
            Membership,
            Membership.user_id == data.user_id,
            Membership.facility_id == ctx.facility_id,
            Membership.role == data.role,
            lock=True,
        )
        if data.operation == "GRANT":
            if not member:
                store.add(
                    Membership(user_id=data.user_id, facility_id=ctx.facility_id, role=data.role)
                )
            if data.role == "DOCTOR" and not store.one(Doctor, Doctor.user_id == data.user_id):
                store.add(Doctor(user_id=data.user_id))
        elif member:
            if data.role in {"ADMIN", "SUPER_ADMIN"}:
                other = store.one(
                    Membership,
                    Membership.facility_id == ctx.facility_id,
                    Membership.role == data.role,
                    Membership.user_id != data.user_id,
                    exists().where(
                        and_(
                            User.id == Membership.user_id,
                            User.active.is_(True),
                            User.verified.is_(True),
                        )
                    ),
                )
                if not other:
                    raise AppError(
                        "LAST_OPERATOR", "Cannot remove the final active operator of this role", 409
                    )
            db.delete(member)
        audit(
            store,
            ctx,
            "membership." + data.operation.lower(),
            "user",
            data.user_id,
            reason=data.reason,
        )
        result = {"user_id": str(data.user_id), "role": data.role, "operation": data.operation}
        remember(store, ctx, "membership.change", key, ns, hashed, data.user_id, result)
        return result


def account_state(ctx, identifier, data):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx, super_only=True)
        if identifier == ctx.actor_id:
            forbidden()
        user = store.get(User, identifier, lock=True)
        links = store.list(Membership, Membership.user_id == identifier, limit=1001)
        if not user or not links or len(links) > 1000:
            missing()
        facilities = [store.get(Facility, m.facility_id) for m in links]
        if any(f.organization_id != ctx.organization_id for f in facilities):
            forbidden()
        # Never allow one facility's operator to disable a user from another facility.
        if any(m.facility_id != ctx.facility_id for m in links):
            forbidden()
        if not data.active:
            for role in ("ADMIN", "SUPER_ADMIN"):
                if any(m.role == role for m in links) and not store.one(
                    Membership,
                    Membership.facility_id == ctx.facility_id,
                    Membership.role == role,
                    Membership.user_id != identifier,
                    exists().where(
                        and_(
                            User.id == Membership.user_id,
                            User.active.is_(True),
                            User.verified.is_(True),
                        )
                    ),
                ):
                    raise AppError("LAST_OPERATOR", "Cannot disable the final active operator", 409)
            db.execute(
                update(Session)
                .where(Session.user_id == identifier, Session.revoked_at.is_(None))
                .values(revoked_at=now())
            )
        user.active = data.active
        audit(store, ctx, "account.state", "user", identifier, reason=data.reason)
        return {"id": str(identifier), "active": user.active}


def departments(ctx, data=None, key=None):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx)
        if data:
            previous, ns, hashed = replay(store, ctx, "department.create", key, data.model_dump())
            if previous:
                return previous
            row = store.add(Department(facility_id=ctx.facility_id, name=data.name))
            audit(store, ctx, "department.create", "department", row.id)
            result = {
                "id": str(row.id),
                "name": row.name,
                "active": row.active,
                "version": row.version,
            }
            remember(store, ctx, "department.create", key, ns, hashed, row.id, result)
            return result
        audit(store, ctx, "department.list", "facility", ctx.facility_id)
        return {
            "items": [
                {"id": str(d.id), "name": d.name, "active": d.active, "version": d.version}
                for d in store.list(
                    Department, Department.facility_id == ctx.facility_id, limit=100
                )
            ]
        }


def update_department(ctx, identifier, data):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx)
        row = store.one(
            Department,
            Department.id == identifier,
            Department.facility_id == ctx.facility_id,
            lock=True,
        )
        if not row:
            missing()
        if row.version != data.expected_version:
            raise AppError("VERSION_CONFLICT", "Department changed; reload", 409)
        if not data.active and store.one(
            StaffDepartment, StaffDepartment.department_id == identifier
        ):
            raise AppError(
                "DEPARTMENT_NOT_EMPTY", "Unassign staff before archiving department", 409
            )
        row.name = data.name
        row.active = data.active
        row.version += 1
        audit(store, ctx, "department.update", "department", row.id)
        return {"id": str(row.id), "version": row.version, "active": row.active, "name": row.name}


def assign_department(ctx, data):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx)
        department = store.one(
            Department,
            Department.id == data.department_id,
            Department.facility_id == ctx.facility_id,
            Department.active.is_(True),
            lock=True,
        )
        member = store.one(
            Membership,
            Membership.user_id == data.user_id,
            Membership.facility_id == ctx.facility_id,
            Membership.role != "PATIENT",
        )
        if not department or (data.assigned and not member):
            missing()
        item = store.one(
            StaffDepartment,
            StaffDepartment.user_id == data.user_id,
            StaffDepartment.department_id == data.department_id,
        )
        if data.assigned and not item:
            store.add(StaffDepartment(user_id=data.user_id, department_id=data.department_id))
        if not data.assigned and item:
            db.delete(item)
        audit(store, ctx, "department.assignment", "department", data.department_id)
        return data.model_dump(mode="json")


def configuration(ctx, data=None):
    with session_factory().begin() as db:
        store = Store(db)
        admin_scope(store, ctx)
        row = store.one(
            FacilityConfiguration,
            FacilityConfiguration.facility_id == ctx.facility_id,
            lock=bool(data),
        )
        if data:
            if data.expected_version != (row.version if row else 0):
                raise AppError("VERSION_CONFLICT", "Configuration changed; reload", 409)
            values = data.model_dump(exclude={"expected_version"})
            if row:
                row.values = values
                row.version += 1
                row.updated_by = ctx.actor_id
            else:
                row = store.add(
                    FacilityConfiguration(
                        facility_id=ctx.facility_id, values=values, updated_by=ctx.actor_id
                    )
                )
            audit(store, ctx, "configuration.update", "facility", ctx.facility_id)
        else:
            audit(store, ctx, "configuration.read", "facility", ctx.facility_id)
        return {
            "version": row.version if row else 0,
            "values": row.values if row else OperationalValues().model_dump(),
        }


def remove_availability(ctx, doctor_id, identifier):
    ctx.require("availability.write")
    with session_factory().begin() as db:
        store = Store(db)
        doctor_access(store, ctx, doctor_id)
        store.advisory_lock(f"doctor-schedule:{doctor_id}")
        row = store.one(
            Availability,
            Availability.id == identifier,
            Availability.doctor_id == doctor_id,
            Availability.facility_id == ctx.facility_id,
            lock=True,
        )
        if not row:
            missing()
        if store.one(
            Appointment,
            Appointment.doctor_id == doctor_id,
            Appointment.status == "SCHEDULED",
            Appointment.starts_at < row.ends_at,
            Appointment.ends_at > row.starts_at,
        ):
            raise AppError(
                "BOOKED_AVAILABILITY",
                "Cannot remove an availability window containing bookings",
                409,
            )
        db.delete(row)
        audit(store, ctx, "availability.remove", "doctor", doctor_id)
        return {"status": "REMOVED"}
