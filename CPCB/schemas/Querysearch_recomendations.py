from pydantic import  BaseModel
from CPCB.schemas.Querysearch_Response import QueryResponse

class Queryrecommend(BaseModel):
    query: str
    total_result: int
    recomendations: list[QueryResponse]