"""Governed orchestration. Deliberately no ORM, database, SQL or provider imports."""

from backend.app.execution import healthcare as commands


class Workflows:
    def __init__(self, executor=commands):
        self.executor = executor

    def patient_intake(self, context, validated, idempotency_key):
        context.require("patient.write")
        return self.executor.create_patient(context, validated, idempotency_key)

    def book(self, context, validated, idempotency_key):
        context.require("schedule.write")
        return self.executor.create_appointment(context, validated, idempotency_key)

    def draft_invoice(self, context, validated, idempotency_key):
        context.require("billing.write")
        return self.executor.create_invoice(context, validated, idempotency_key)
