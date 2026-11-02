from pydantic import  BaseModel

class QueryResponse(BaseModel):
    Rank: int 
    Requirement_id : str
    Chapter : str
    parameter : str
    Requirements : str
    Requirement_actions : str
