"""RFC 6238 TOTP primitives. No account lookup, network, logging or token URLs."""

import base64
import hmac
import struct


def code(secret: str, counter: int) -> str:
    key = base64.b32decode(secret, casefold=True)
    mac = hmac.digest(key, struct.pack(">Q", counter), "sha1")
    offset = mac[-1] & 15
    value = struct.unpack(">I", mac[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1000000:06d}"


def match(secret: str, supplied: str, counter: int, last_counter: int) -> int | None:
    for step in range(max(0, counter - 1), counter + 2):
        if step > last_counter and hmac.compare_digest(code(secret, step), supplied):
            return step
    return None
