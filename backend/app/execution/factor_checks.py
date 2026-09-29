"""Caller holds the user row lock, serializing second-factor consumption."""

import hmac
from backend.app.models.operations import MultiFactor
from backend.app.core.encryption import cipher
from backend.app.core.security import digest, now
from backend.app.services.totp import match


def check_factor(store, user_id, supplied):
    factor = store.one(MultiFactor, MultiFactor.user_id == user_id, lock=True)
    if not factor or not factor.enabled:
        return True
    if not supplied:
        return False
    hashed = digest(supplied)
    for value in factor.recovery_hashes:
        if hmac.compare_digest(value, hashed):
            factor.recovery_hashes = [v for v in factor.recovery_hashes if v != hashed]
            return True
    secret = cipher().decrypt(factor.encrypted_secret, f"mfa:{user_id}")["secret"]
    counter = match(secret, supplied, int(now().timestamp()) // 30, factor.last_counter)
    if counter is None:
        return False
    factor.last_counter = counter
    return True
