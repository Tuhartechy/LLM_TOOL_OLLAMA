from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class ToolCallFunction(BaseModel):
    name: str
    arguments: Dict[str, Any]

class ToolCall(BaseModel):
    id: Optional[str] = None
    type: str = "function"
    function: ToolCallFunction

class MessageSchema(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

class ConversationSchema(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

class ConversationDetailSchema(ConversationSchema):
    messages: List[MessageSchema]

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)

class ChatRequest(BaseModel):
    conversation_id: str
    model: str = "llama3.2:1b"
    message: str = Field(..., min_length=1)
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(1024, ge=64, le=4096)
    system_prompt: Optional[str] = "You are a helpful, concise AI assistant."
    use_rag: bool = False
