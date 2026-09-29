"""Internal ports, not fabricated vendor wire protocols. No adapters activated."""

from typing import Protocol
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from backend.app.core.errors import NotConfigured


class InternalMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recipient: str
    template: str
    correlation_id: str


class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invoice_id: str
    amount: Decimal
    currency: str
    idempotency_key: str


class InsuranceProvider(Protocol):
    def verify_member(self, member_reference: str) -> dict: ...
    def submit_claim(self, claim_reference: str) -> dict: ...
    def get_claim_status(self, claim_reference: str) -> dict: ...
    def cancel_claim(self, claim_reference: str) -> dict: ...


class PaymentProvider(Protocol):
    def create_payment(self, request: PaymentRequest) -> dict: ...
    def verify_payment(self, transaction_reference: str) -> dict: ...
    def refund_payment(self, transaction_reference: str, amount: Decimal) -> dict: ...
    def get_payment_status(self, transaction_reference: str) -> dict: ...


class EmailProvider(Protocol):
    def send(self, message: InternalMessage) -> str: ...


class SMSProvider(Protocol):
    def send(self, message: InternalMessage) -> str: ...


class KeyWrapper(Protocol):
    def wrap(self, data_key: bytes, context: bytes) -> dict: ...
    def unwrap(self, wrapped: dict, context: bytes) -> bytes: ...


class ObjectStorage(Protocol):
    def quarantine(self, content: bytes, reference: str) -> str: ...
    def read_authorized(self, reference: str) -> bytes: ...


class MalwareScanner(Protocol):
    def scan(self, content: bytes) -> bool: ...


class UnconfiguredInsurance:
    def verify_member(self, member_reference):
        raise NotConfigured("insurance")

    def submit_claim(self, claim_reference):
        raise NotConfigured("insurance")

    def get_claim_status(self, claim_reference):
        raise NotConfigured("insurance")

    def cancel_claim(self, claim_reference):
        raise NotConfigured("insurance")


class UnconfiguredPayment:
    def create_payment(self, request):
        raise NotConfigured("payment")

    def verify_payment(self, transaction_reference):
        raise NotConfigured("payment")

    def refund_payment(self, transaction_reference, amount):
        raise NotConfigured("payment")

    def get_payment_status(self, transaction_reference):
        raise NotConfigured("payment")


class UnconfiguredDelivery:
    def send(self, message):
        raise NotConfigured("external notification delivery")


INTEGRATIONS = (
    "insurance",
    "payment",
    "email",
    "sms",
    "clinical-inference",
    "clinical-sops",
    "terminology",
    "object-storage",
    "malware-scanner",
    "production-kms",
)


def statuses():
    return [{"name": name, "status": "NOT_CONFIGURED"} for name in INTEGRATIONS]
