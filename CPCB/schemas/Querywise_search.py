from pydantic import  BaseModel,Field

class Querysearch(BaseModel):
        query: str = Field(...,ex="Enter your Query based on your requirements: (like: What are the requirements for coal washery paved surfaces?)")