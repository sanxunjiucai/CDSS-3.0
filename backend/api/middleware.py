import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("cdss.access")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.time()
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} "
            f"-> {response.status_code} [{duration:.1f}ms]"
        )
        return response
