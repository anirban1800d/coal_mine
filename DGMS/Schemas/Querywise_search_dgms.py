from pydantic import BaseModel,Field

class QueryDGMS(BaseModel):
    query: str = Field(...,ex="Enter your Query based on your requirements: (like: What are the requirements for appointing a competent person?)")