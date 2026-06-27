from pydantic import BaseModel, EmailStr
from typing import List, Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    goals: Optional[List[str]] = []
    learning_style: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class VoiceCommand(BaseModel):
    command: str

class LearningPathUpdate(BaseModel):
    learning_goal: str
    goals: Optional[List[str]] = None
    learning_style: Optional[str] = None

class CodeExecutionRequest(BaseModel):
    code: str
    language: str
    lesson_id: Optional[str] = None
    test_cases: Optional[List[dict]] = None
