from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Profile
from ..schemas import (
    UserCreate,
    UserLogin,
    Token,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from ..auth.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )

    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db_profile = Profile(user_id=db_user.id)
    db.add(db_profile)
    db.commit()

    return db_user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "name": user.name,
        "email": user.email
    }

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return the same message to avoid email enumeration
    generic = {"message": "If that email matches an account, we have sent a reset link to it."}
    if not user:
        return generic

    reset_token = create_access_token(
        data={"sub": payload.email, "type": "reset"},
        expires_delta=timedelta(minutes=30),
    )
    reset_link = f"http://localhost:3000/auth/reset-password?token={reset_token}"
    print(f"[DEBUG] Password reset link for {payload.email}: {reset_link}")
    return {**generic, "debug_reset_link": reset_link}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    try:
        decoded = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token.")
        email = decoded.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid reset token.")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user.password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully. You can now sign in."}

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out"}
