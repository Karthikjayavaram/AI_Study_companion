from fastapi import HTTPException, status


class AppBaseException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class EntityNotFoundException(AppBaseException):
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(f"{entity_name} with id '{entity_id}' not found.", status.HTTP_404_NOT_FOUND)


class AuthorizationException(AppBaseException):
    def __init__(self, message: str = "Access denied for this resource."):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class AuthenticationException(AppBaseException):
    def __init__(self, message: str = "Could not validate credentials."):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)
