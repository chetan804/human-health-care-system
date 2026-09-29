"""Pure deterministic policy helpers: no database or provider I/O."""

from decimal import Decimal
from datetime import timedelta
from backend.app.core.errors import AppError


ROLE_PERMISSIONS = {
    "PATIENT": {
        "patient.read",
        "schedule.read",
        "schedule.write",
        "billing.read",
        "dispute.write",
        "consent.write",
        "ai.read",
    },
    "DOCTOR": {
        "patient.read",
        "schedule.read",
        "schedule.write",
        "clinical.read",
        "clinical.write",
        "ai.read",
    },
    "NURSE": {"patient.read", "schedule.read", "schedule.write", "clinical.read"},
    "ADMIN": {
        "patient.read",
        "patient.write",
        "schedule.read",
        "schedule.write",
        "availability.write",
        "admin.read",
        "assignment.write",
    },
    "BILLING_STAFF": {"billing.read", "billing.write", "dispute.write"},
    "LAB_TECHNICIAN": {"clinical.lab"},
    "SYSTEM_AUDITOR": {"audit.read"},
    "SUPER_ADMIN": {"admin.read"},
}


def permits(roles: tuple[str, ...], permission: str) -> bool:
    return any(permission in ROLE_PERMISSIONS.get(role, set()) for role in roles)


def invoice_total(items) -> Decimal:
    total = sum((item.unit_price * item.quantity for item in items), Decimal("0"))
    if total <= 0 or total >= Decimal("10000000000000000"):
        raise AppError("VALIDATION_ERROR", "Invoice total is outside supported bounds", 422)
    return total


def available_candidates(windows, bookings, requested, duration, earliest):
    """Search a documented ±2h window on a 15-minute grid; not a medical duration policy."""
    results = []
    for step in range(-8, 9):
        start = requested + timedelta(minutes=step * 15)
        end = start + duration
        if start < earliest:
            continue
        if not any(a <= start and b >= end for a, b in windows):
            continue
        if any(start < b and end > a for a, b in bookings):
            continue
        results.append({"starts_at": start.isoformat(), "ends_at": end.isoformat()})
    return results
