from starlette.responses import JSONResponse


class BodyLimitMiddleware:
    """Cap streamed request bodies before multipart spooling or JSON parsing."""
    def __init__(self, app, limit: int):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH", "DELETE"):
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            length = 0
        if length > self.limit:
            return await JSONResponse({"detail": "Berkas melebihi batas unggahan", "code": "body_too_large"}, 413)(scope, receive, send)
        total = 0
        messages = []
        while True:
            message = await receive()
            total += len(message.get("body", b""))
            if total > self.limit:
                return await JSONResponse({"detail": "Berkas melebihi batas unggahan", "code": "body_too_large"}, 413)(scope, receive, send)
            messages.append(message)
            if not message.get("more_body", False):
                break
        # Buffer only up to the hard limit. A parser cannot swallow a size exception into a 400.
        index = 0
        async def bounded_receive():
            nonlocal index
            if index < len(messages):
                message = messages[index]
                index += 1
                return message
            return await receive()
        await self.app(scope, bounded_receive, send)
