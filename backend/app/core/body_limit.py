"""Bound the actual ASGI body, including chunked requests and missing Content-Length."""

from uuid import uuid4
from starlette.responses import JSONResponse


class BodyLimitMiddleware:
    def __init__(self, app, limit=65536):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] in {"GET", "HEAD", "OPTIONS"}:
            return await self.app(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body = message.get("body", b"")
            size += len(body)
            if size > self.limit:
                result = JSONResponse(
                    {
                        "success": False,
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": "Request body exceeds limit",
                            "details": {},
                        },
                        "meta": {
                            "request_id": scope.get("state", {}).get("request_id", str(uuid4()))
                        },
                    },
                    status_code=413,
                )
                return await result(scope, receive, send)
            chunks.append(body)
            if not message.get("more_body", False):
                break
        sent = False

        async def bounded_receive():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await receive()

        return await self.app(scope, bounded_receive, send)
