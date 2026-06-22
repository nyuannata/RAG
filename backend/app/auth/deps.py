from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.db.session import get_db
from app.auth.security import verify_token
from app.models.models import User

# Extract token from Authorization: Bearer <JWT> header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False  # Allow us to customize the error message or handle guest access
)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency injection to authenticate user.
    Throws 401 Unauthorized if token is invalid or user does not exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau telah kedaluwarsa. Silakan login kembali.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    user_id_str = verify_token(token)
    if not user_id_str:
        raise credentials_exception
    
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception
        
    result = await db.execute(select(User).filter(User.id == user_uuid))
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
        
    return user
