from pydantic import BaseModel, ConfigDict, Field


class UserRegister(BaseModel):
    email: str = Field(max_length=255)
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)
    
    last_name: str = Field(max_length=255)
    first_name: str = Field(max_length=255)
    middle_name: str | None = Field(default=None, max_length=255)
    
    course_id: int | None = None
    program_id: int | None = None
    group_name: str | None = Field(default=None, max_length=100)
    

class UserLogin(BaseModel):
    email: str
    password: str
    

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    

class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    username: str
    
    last_name: str
    first_name: str
    middle_name: str | None
    
    role_id: int
    role_name: str | None
    is_active: bool
    
    course_id: int | None
    program_id: int | None
    group_name: str | None
    
