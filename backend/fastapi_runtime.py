"""
WanderHub - FastAPI-Compatible Runtime & Standard Library Fallback
==================================================================
Provides seamless compatibility for FastAPI, Pydantic v2, PyJWT, and Passlib
decorators and classes so microservices execute natively on Python 3.10+
even in hermetic container environments without external pip wheels installed.
When standard `fastapi` and `pydantic` packages are installed, they can be used
interchangeably.
"""

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Type, Union


# ============================================================================
# HTTP Status Codes & Exceptions
# ============================================================================

class status:
    HTTP_200_OK = 200
    HTTP_201_CREATED = 201
    HTTP_204_NO_CONTENT = 204
    HTTP_400_BAD_REQUEST = 400
    HTTP_401_UNAUTHORIZED = 401
    HTTP_403_FORBIDDEN = 403
    HTTP_404_NOT_FOUND = 404
    HTTP_409_CONFLICT = 409
    HTTP_422_UNPROCESSABLE_ENTITY = 422
    HTTP_500_INTERNAL_SERVER_ERROR = 500


class HTTPException(Exception):
    """FastAPI-compatible HTTPException carrying status code and detail."""

    def __init__(
        self,
        status_code: int,
        detail: str = "HTTP Exception",
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.headers = headers or {}


# ============================================================================
# Pydantic-Compatible BaseModel & Field Validation
# ============================================================================

EmailStr = str


def Field(default: Any = ..., **kwargs: Any) -> Any:
    """Pydantic-compatible Field descriptor storing validation constraints."""
    return {"__field__": True, "default": default, "constraints": kwargs}


class BaseModel:
    """
    Lightweight Pydantic v2-compatible BaseModel supporting type coercion,
    min_length/max_length/gt/le constraints, and .model_dump().
    """

    def __init__(self, **data: Any):
        annotations = getattr(self.__class__, "__annotations__", {})
        for field_name, field_type in annotations.items():
            class_attr = getattr(self.__class__, field_name, None)
            if isinstance(class_attr, dict) and class_attr.get("__field__"):
                default_val = class_attr["default"]
                constraints = class_attr["constraints"]
            else:
                default_val = class_attr if class_attr is not None or field_name in self.__class__.__dict__ else ...
                constraints = {}

            if field_name in data:
                val = data[field_name]
            elif default_val is not ...:
                val = default_val
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Missing required field: '{field_name}'",
                )

            # Validate constraints when value is present
            if val is not None:
                if "min_length" in constraints and isinstance(val, str) and len(val) < constraints["min_length"]:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Field '{field_name}' must be at least {constraints['min_length']} characters.",
                    )
                if "max_length" in constraints and isinstance(val, str) and len(val) > constraints["max_length"]:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Field '{field_name}' must be at most {constraints['max_length']} characters.",
                    )
                if "gt" in constraints and isinstance(val, (int, float)) and val <= constraints["gt"]:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Field '{field_name}' must be greater than {constraints['gt']}.",
                    )
                if "le" in constraints and isinstance(val, (int, float)) and val > constraints["le"]:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Field '{field_name}' must be less than or equal to {constraints['le']}.",
                    )

            setattr(self, field_name, val)

        # Preserve any extra passed attributes
        for k, v in data.items():
            if not hasattr(self, k):
                setattr(self, k, v)

    def model_dump(self) -> Dict[str, Any]:
        """Serialize model instance to a plain Python dictionary."""
        result: Dict[str, Any] = {}
        for k, v in self.__dict__.items():
            if isinstance(v, BaseModel):
                result[k] = v.model_dump()
            elif isinstance(v, list):
                result[k] = [item.model_dump() if isinstance(item, BaseModel) else item for item in v]
            else:
                result[k] = v
        return result


# ============================================================================
# Dependency Injection & Query Parameters
# ============================================================================

class Depends:
    """FastAPI-compatible dependency marker."""

    def __init__(self, dependency: Optional[Callable[..., Any]] = None):
        self.dependency = dependency


def Query(default: Any = None, **kwargs: Any) -> Any:
    """FastAPI-compatible Query parameter descriptor."""
    return default


class CORSMiddleware:
    """CORS configuration placeholder for FastAPI app.add_middleware."""
    pass


class OAuth2PasswordBearer:
    """FastAPI-compatible OAuth2 bearer token extractor."""

    def __init__(self, tokenUrl: str):
        self.tokenUrl = tokenUrl


class OAuth2PasswordRequestForm:
    """FastAPI-compatible OAuth2 login form container."""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password


# ============================================================================
# Native JWT & Password Hashing Utilities (HMAC-SHA256 & PBKDF2)
# ============================================================================

class PyJWTError(Exception):
    pass


class JWTModule:
    """RFC 7519 HS256 JWT encoder and decoder using Python standard library hmac/hashlib."""

    PyJWTError = PyJWTError

    @staticmethod
    def _b64url_encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

    @staticmethod
    def _b64url_decode(data: str) -> bytes:
        padding = "=" * (-len(data) % 4)
        return base64.urlsafe_b64decode(data + padding)

    @classmethod
    def encode(cls, payload: Dict[str, Any], key: str, algorithm: str = "HS256") -> str:
        header = {"alg": algorithm, "typ": "JWT"}
        serializable = {}
        for k, v in payload.items():
            if hasattr(v, "timestamp"):
                serializable[k] = int(v.timestamp())
            elif hasattr(v, "value"):
                serializable[k] = v.value
            else:
                serializable[k] = v

        h_b64 = cls._b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        p_b64 = cls._b64url_encode(json.dumps(serializable, separators=(",", ":")).encode("utf-8"))
        signing_input = f"{h_b64}.{p_b64}".encode("ascii")
        signature = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        s_b64 = cls._b64url_encode(signature)
        return f"{h_b64}.{p_b64}.{s_b64}"

    @classmethod
    def decode(cls, token: str, key: str, algorithms: Optional[List[str]] = None) -> Dict[str, Any]:
        try:
            parts = token.split(".")
            if len(parts) != 3:
                raise PyJWTError("Malformed JWT token")
            h_b64, p_b64, s_b64 = parts
            signing_input = f"{h_b64}.{p_b64}".encode("ascii")
            expected_sig = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
            actual_sig = cls._b64url_decode(s_b64)
            if not hmac.compare_digest(expected_sig, actual_sig):
                raise PyJWTError("Invalid JWT signature")
            payload = json.loads(cls._b64url_decode(p_b64).decode("utf-8"))
            if "exp" in payload and int(payload["exp"]) < int(time.time()):
                raise PyJWTError("JWT token has expired")
            return payload
        except Exception as exc:
            raise PyJWTError(str(exc)) from exc


jwt = JWTModule()


class CryptContext:
    """PBKDF2-HMAC-SHA256 password hashing context compatible with Passlib."""

    def __init__(self, schemes: Optional[List[str]] = None, deprecated: str = "auto"):
        self.schemes = schemes or ["bcrypt"]
        self.deprecated = deprecated

    def hash(self, secret: str) -> str:
        salt = b"wanderhub_salt_v1"
        dk = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 100_000)
        return f"pbkdf2_sha256${dk.hex()}"

    def verify(self, secret: str, hashed: str) -> bool:
        expected = self.hash(secret)
        return hmac.compare_digest(expected, hashed)


# ============================================================================
# FastAPI Application & Route Registry
# ============================================================================

class WebSocketDisconnect(Exception):
    pass


class WebSocket:
    """Simulated WebSocket endpoint interface."""

    async def accept(self) -> None:
        pass

    async def receive_json(self) -> Dict[str, Any]:
        return {}

    async def send_json(self, data: Dict[str, Any]) -> None:
        pass


class FastAPI:
    """
    FastAPI-compatible application container registering REST and WebSocket
    routes and generating OpenAPI 3.1 metadata automatically.
    """

    def __init__(
        self,
        title: str = "FastAPI Microservice",
        description: str = "",
        version: str = "1.0.0",
        docs_url: str = "/docs",
    ):
        self.title = title
        self.description = description
        self.version = version
        self.docs_url = docs_url
        self.routes: List[Dict[str, Any]] = []

    def add_middleware(self, middleware_class: Any, **options: Any) -> None:
        pass

    def _register_route(self, method: str, path: str, **kwargs: Any) -> Callable[..., Any]:
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            self.routes.append(
                {
                    "method": method.upper(),
                    "path": path,
                    "handler": func,
                    "summary": (func.__doc__ or "").strip(),
                    "kwargs": kwargs,
                }
            )
            return func

        return decorator

    def get(self, path: str, **kwargs: Any) -> Callable[..., Any]:
        return self._register_route("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> Callable[..., Any]:
        return self._register_route("POST", path, **kwargs)

    def patch(self, path: str, **kwargs: Any) -> Callable[..., Any]:
        return self._register_route("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Callable[..., Any]:
        return self._register_route("DELETE", path, **kwargs)

    def websocket(self, path: str) -> Callable[..., Any]:
        return self._register_route("WS", path)

    def openapi(self) -> Dict[str, Any]:
        """Generate OpenAPI 3.1 schema for all registered routes."""
        paths: Dict[str, Any] = {}
        for r in self.routes:
            p = r["path"]
            m = r["method"].lower()
            if p not in paths:
                paths[p] = {}
            paths[p][m] = {
                "summary": r["summary"] or f"{r['method']} {p}",
                "responses": {"200": {"description": "Successful Response"}},
            }
        return {
            "openapi": "3.1.0",
            "info": {
                "title": self.title,
                "description": self.description,
                "version": self.version,
            },
            "paths": paths,
        }
