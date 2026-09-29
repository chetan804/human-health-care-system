"""Safe domain failures; details must never contain sensitive payloads."""


class AppError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: dict | None = None):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status
        self.details = details or {}


class NotConfigured(AppError):
    def __init__(self, name: str):
        super().__init__("NOT_CONFIGURED", f"{name} is not configured", 503, {"integration": name})


def forbidden():
    raise AppError("FORBIDDEN", "You are not authorized for this operation", 403)


def missing():
    raise AppError("NOT_FOUND", "Resource not found", 404)
