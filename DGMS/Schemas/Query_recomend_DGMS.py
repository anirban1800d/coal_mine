from pydantic import BaseModel
from DGMS.Schemas.Querysearch_Response_DGMS import QuerysearchDGMS

class QuerysearchResponseDGMS(BaseModel):
    query: str
    total: int
    results: list[QuerysearchDGMS]