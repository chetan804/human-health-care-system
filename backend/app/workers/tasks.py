"""Recoverable PostgreSQL outbox processing. External delivery remains NOT_CONFIGURED."""

from datetime import timedelta
from celery import Celery
from sqlalchemy import exists, func, cast, String, or_, and_
from backend.app.core.config import settings
from backend.app.core.database import session_factory
from backend.app.core.security import now
from backend.app.models.entities import Outbox, Notification, DeliveryAttempt, Appointment, Patient
from backend.app.repositories.store import Store
from backend.app.models.operations import FacilityConfiguration
from backend.app.execution.exchange import process_jobs
from backend.app.execution.documents import scan_pending


def celery_app():
    app = Celery("hcs", broker=settings().redis_url)
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        enable_utc=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        beat_schedule={
            "document-scans": {"task": "hcs.document_scans", "schedule": 10.0},
            "exchange": {"task": "hcs.exchange", "schedule": 10.0},
            "outbox": {"task": "hcs.process_outbox", "schedule": 10.0},
            "reminders": {"task": "hcs.reminders", "schedule": 60.0},
        },
    )
    app.task(name="hcs.process_outbox")(process_outbox)
    app.task(name="hcs.reminders")(reminders)
    app.task(name="hcs.exchange")(process_jobs)
    app.task(name="hcs.document_scans")(scan_pending)
    return app


def process_outbox():
    """One transaction owns event claim, notification and delivery-unavailable evidence."""
    with session_factory().begin() as db:
        store = Store(db)
        events = store.list(
            Outbox, Outbox.processed_at.is_(None), limit=100, lock=True, order=Outbox.created_at
        )
        for event in events:
            if event.kind == "appointment.reminder":
                appointment = store.get(Appointment, event.resource_id, lock=True)
                parts = event.event_key.split(":")
                if (
                    not appointment
                    or appointment.status != "SCHEDULED"
                    or appointment.starts_at <= now()
                    or str(appointment.version) != parts[-2]
                ):
                    event.processed_at = now()
                    continue
            store.add(
                Notification(
                    outbox_id=event.id,
                    recipient_id=event.recipient_id,
                    facility_id=event.facility_id,
                    kind=event.kind,
                    resource_id=event.resource_id,
                )
            )
            for channel in ("EMAIL", "SMS"):
                store.add(
                    DeliveryAttempt(outbox_id=event.id, channel=channel, status="NOT_CONFIGURED")
                )
            event.processed_at = now()
        return len(events)


def reminders():
    with session_factory().begin() as db:
        store = Store(db)
        count = 0
        configs = store.list(FacilityConfiguration, limit=10001)
        if len(configs) > 10000:
            raise RuntimeError(
                "Configuration population exceeds supported reminder batch; operator action required"
            )
        offsets = set(settings().reminders_minutes)
        for config in configs:
            offsets.update(config.values["reminders_minutes"])
        for minutes in sorted(offsets):
            time = now()
            appointments = store.list(
                Appointment,
                Appointment.status == "SCHEDULED",
                or_(
                    exists().where(
                        and_(
                            FacilityConfiguration.facility_id == Appointment.facility_id,
                            FacilityConfiguration.values["reminders_minutes"].contains([minutes]),
                        )
                    ),
                    and_(
                        ~exists().where(
                            FacilityConfiguration.facility_id == Appointment.facility_id
                        ),
                        minutes in settings().reminders_minutes,
                    ),
                ),
                Appointment.starts_at > time,
                Appointment.starts_at <= time + timedelta(minutes=minutes),
                ~exists().where(
                    Outbox.event_key
                    == func.concat(
                        "reminder:",
                        cast(Appointment.id, String),
                        ":",
                        cast(Appointment.version, String),
                        ":",
                        str(minutes),
                    )
                ),
                limit=1000,
                order=Appointment.starts_at,
                lock=True,
            )
            for appointment in appointments:
                key = f"reminder:{appointment.id}:{appointment.version}:{minutes}"
                if store.one(Outbox, Outbox.event_key == key):
                    continue
                patient = store.get(Patient, appointment.patient_id)
                if patient.deleted_at:
                    continue
                store.add(
                    Outbox(
                        event_key=key,
                        facility_id=appointment.facility_id,
                        recipient_id=patient.user_id or appointment.created_by,
                        kind="appointment.reminder",
                        resource_id=appointment.id,
                    )
                )
                count += 1
        return count
