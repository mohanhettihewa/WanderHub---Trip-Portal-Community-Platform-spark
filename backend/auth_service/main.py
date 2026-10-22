"""
WanderHub - Auth & Role-Based Access Control (RBAC) Microservice
Port: 8001
Framework: FastAPI (Python 3.10+ / 3.12+), PyJWT, Passlib, Pydantic v2
"""

from enum import Enum
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional, Dict
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import jwt
from passlib.context import CryptContext

app = FastAPI(
    title="WanderHub Auth & RBAC Microservice",
    description="Microservice responsible for authentication, token issuance, and role enforcement.",
    version="1.0.0",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

SECRET_KEY = "wanderhub-super-secret-production-signing-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

class UserRole(str, Enum):
    ORGANIZER = "Organizer"
    PARTICIPANT = "Participant"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.PARTICIPANT
    phone: Optional[str] = None
    organization_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole

# Pre-seeded users store (In production: PostgreSQL database)
DB_USERS: Dict[str, dict] = {
    "elena@summitexpeditions.org": {
        "id": "usr_org_01",
        "email": "elena@summitexpeditions.org",
        "full_name": "Elena Rostova",
        "role": UserRole.ORGANIZER,
        "phone": "+1 (555) 234-8901",
        "organization_name": "Summit Alpine Expeditions",
        "hashed_password": pwd_context.hash("Password123!"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    "marcus.vance@gmail.com": {
        "id": "usr_part_01",
        "email": "marcus.vance@gmail.com",
        "full_name": "Marcus Vance",
        "role": UserRole.PARTICIPANT,
        "phone": "+1 (555) 876-5432",
        "organization_name": None,
        "hashed_password": pwd_context.hash("Password123!"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT access token containing subject and role claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> UserResponse:
    """Validate bearer token and resolve authenticated user identity."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials or expired authentication session",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None or email not in DB_USERS:
            raise credentials_exception
        return UserResponse(**DB_USERS[email])
    except jwt.PyJWTError:
        raise credentials_exception

def require_role(required_role: UserRole):
    """
    FastAPI Role-Based Access Control (RBAC) Dependency.
    Ensures requester possesses required role privilege or raises 403 Forbidden.
    """
    async def role_checker(current_user: Annotated[UserResponse, Depends(get_current_user)]) -> UserResponse:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"403 Forbidden: Requires '{required_role.value}' role. You are authenticated as '{current_user.role.value}'."
            )
        return current_user
    return role_checker

@app.post("/api/v1/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """Register a new user profile with selected role."""
    if user_in.email in DB_USERS:
        raise HTTPException(status_code=400, detail="Email is already registered")

    new_id = f"usr_{len(DB_USERS) + 1:02d}"
    record = {
        "id": new_id,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "role": user_in.role,
        "phone": user_in.phone,
        "organization_name": user_in.organization_name,
        "hashed_password": pwd_context.hash(user_in.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    DB_USERS[user_in.email] = record
    return UserResponse(**record)

@app.post("/api/v1/auth/token", response_model=TokenResponse)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Standard OAuth2 password bearer token authentication."""
    user = DB_USERS.get(form_data.username)
    if not user or not pwd_context.verify(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user["email"], "role": user["role"]})
    return TokenResponse(access_token=token, role=user["role"])

@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_profile(current_user: Annotated[UserResponse, Depends(get_current_user)]):
    """Fetch current authenticated user profile."""
    return current_user

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
