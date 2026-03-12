from fastapi import HTTPException, status


class CDSSException(HTTPException):
    """业务异常基类"""
    def __init__(self, code: int, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        super().__init__(status_code=status_code, detail=message)


class NotFoundError(CDSSException):
    def __init__(self, resource: str = "资源"):
        super().__init__(code=40401, message=f"{resource}不存在", status_code=404)


class AuthenticationError(CDSSException):
    def __init__(self, message: str = "认证失败"):
        super().__init__(code=40101, message=message, status_code=401)


class PermissionError(CDSSException):
    def __init__(self, message: str = "权限不足"):
        super().__init__(code=40301, message=message, status_code=403)


class ValidationError(CDSSException):
    def __init__(self, message: str):
        super().__init__(code=42201, message=message, status_code=422)


class ExternalServiceError(CDSSException):
    def __init__(self, service: str, message: str = ""):
        super().__init__(
            code=50201,
            message=f"外部服务 [{service}] 调用失败: {message}",
            status_code=502,
        )
