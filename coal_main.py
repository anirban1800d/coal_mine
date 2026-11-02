from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any
import pandas as pd

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from CPCB.load_model import load_model
from CPCB.Search_cpcb_rag import Search_cpcb_rag
from CPCB.schemas.Querywise_search import Querysearch
from CPCB.schemas.Querysearch_Response import QueryResponse
from CPCB.schemas.Querysearch_recomendations import Queryrecommend


from DGMS.load_model import load_model_DGMS
from DGMS.search_dgms_rag import search_dgms
from DGMS.Schemas.Querysearch_Response_DGMS import QuerysearchDGMS
from DGMS.Schemas.Querywise_search_dgms import QueryDGMS
from DGMS.Schemas.Query_recomend_DGMS import QuerysearchResponseDGMS

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
log = logging.getLogger("cpcb_rag_api")

# ── Config ────────────────────────────────────────────────────────────────────

# Querysearch currently only carries `query`, so top-k is fixed here rather
# than invented as a request field. Raise this (or expose it via the schema)
# if you want callers to control it.
DEFAULT_TOP_K_CPCB = 5
DEFAULT_TOP_K_DGMS = 5

# ── Application state ─────────────────────────────────────────────────────────

class AppState:
    model: Any = None       # SentenceTransformer instance (from load_model())
    index: Any = None       # FAISS IndexFlatIP
    rag_data: Any = None    # CPCB RAG dataframe


state = AppState()


# ── Lifespan ──────────────────────────────────────────────────────────────────


# check status of model cpcb
@asynccontextmanager
async def cpcb_lifespan(app: FastAPI):
    log.info("Loading CPCB model, FAISS index, and RAG data via load_model() ...")

    try:
        state.cpcb_model, state.cpcb_index, state.cpcb_rag_data = load_model()
    except Exception as exc:
        log.exception("load_model() raised during startup.")
        raise RuntimeError(f"Startup failed: could not load model/index/data ({exc})") from exc

    if state.cpcb_model is None:
        raise RuntimeError("Startup failed: load_model() returned a None model.")
    if state.cpcb_index is None:
        raise RuntimeError("Startup failed: load_model() returned a None FAISS index.")
    if state.cpcb_rag_data is None:
        raise RuntimeError("Startup failed: load_model() returned a None RAG dataframe.")

    log.info("CPCB RAG assets loaded. Rows in rag_data: %s", len(state.cpcb_rag_data))
    yield
    log.info("Shutting down CPCB RAG API.")


# check status of model dgms
@asynccontextmanager
async def dgms_lifespan(app: FastAPI):
    log.info("Loading DGMS model, FAISS index, and RAG data via load_model_DGMS() ...")

    try:
        state.dgms_model, state.dgms_index, state.dgms_rag_data = load_model_DGMS()
    except Exception as exc:
        log.exception("load_model_DGMS() raised during startup.")
        raise RuntimeError(f"Startup failed: could not load model/index/data ({exc})") from exc

    if state.dgms_model is None:
        raise RuntimeError("Startup failed: load_model_DGMS() returned a None model.")
    if state.dgms_index is None:
        raise RuntimeError("Startup failed: load_model_DGMS() returned a None FAISS index.")
    if state.dgms_rag_data is None:
        raise RuntimeError("Startup failed: load_model_DGMS() returned a None RAG dataframe.")

    log.info("DGMS RAG assets loaded. Rows in rag_data: %s", len(state.dgms_rag_data))
    yield
    log.info("Shutting down DGMS RAG API.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with cpcb_lifespan(app):
        async with dgms_lifespan(app):
            yield

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="CPCB RAG Semantic Search API",
    description="Semantic search over CPCB compliance requirements using FAISS + SentenceTransformer.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HEALTH SCHEMA ─────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str

    cpcb_model_loaded: bool
    cpcb_index_loaded: bool
    cpcb_rows_loaded: int

    dgms_model_loaded: bool
    dgms_index_loaded: bool
    dgms_rows_loaded: int

# ── Core logic ────────────────────────────────────────────────────────────────

def _run_search(query: str, k: int = DEFAULT_TOP_K_CPCB) -> list[QueryResponse]:
    if query is None or not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must not be empty.",
        )

    if k < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="k must be a positive integer.",
        )

    if state.cpcb_model is None or state.cpcb_index is None or state.cpcb_rag_data is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service is not ready: model, index, or RAG data failed to load.",
        )

    try:
        raw_results = Search_cpcb_rag(
            query=query,
            embedding=state.cpcb_model,   # SentenceTransformer instance — see note in header
            index=state.cpcb_index,
            df_rag=state.cpcb_rag_data,
            k=k,
        )
    except Exception as exc:
        log.exception("Search_cpcb_rag failed for query: %s", query)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {exc}",
        ) from exc

    try:
        return [
            QueryResponse(
                Rank=item["rank"],
                Requirement_id=item["requirement_id"],
                Chapter=item["chapter"],
                parameter=item["parameter"],
                Requirements=item["requirement"],
                Requirement_actions="" if pd.isna(item["required_action"]) else str(item["required_action"]),
            )
            for item in raw_results
        ]
    except (KeyError, TypeError) as exc:
        log.exception("Unexpected result shape returned by Search_cpcb_rag.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected search result format: {exc}",
        ) from exc


# DGMS search function

def _run_search_DGMS(query: str,k: int = DEFAULT_TOP_K_DGMS) -> list[QuerysearchDGMS]:

    if query is None or not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must not be empty.",
        )

    if k < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="k must be a positive integer.",
        )

    if (
        state.dgms_model is None
        or state.dgms_index is None
        or state.dgms_rag_data is None
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service is not ready.",
        )

    try:
        raw_results = search_dgms(
            query=query,
            embedding_model=state.dgms_model,
            index=state.dgms_index,
            df=state.dgms_rag_data,
            k=k,
        )

    except Exception as exc:
        log.exception(
            "search_dgms failed for query: %s",
            query
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {exc}",
        ) from exc

    try:
        return [
            QuerysearchDGMS.model_validate(item)
            for item in raw_results
        ]

    except (KeyError, TypeError, ValueError) as exc:
        log.exception(
            "Unexpected result shape returned by search_dgms."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected search result format: {exc}",
        ) from exc

    

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.get("/", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Confirm the API is live and all assets are loaded."""
    return HealthResponse(
        status="ok",
        dgms_model_loaded=state.dgms_model is not None,
        dgms_index_loaded=state.dgms_index is not None,
        dgms_rows_loaded=len(state.dgms_rag_data) if state.dgms_rag_data is not None else 0,
        cpcb_model_loaded=state.cpcb_model is not None,
        cpcb_index_loaded=state.cpcb_index is not None,
        cpcb_rows_loaded=len(state.cpcb_rag_data) if state.cpcb_rag_data is not None else 0,
    )


@app.post(
    "/cpcb/search",
    response_model=Queryrecommend,
    tags=["CPCB Semantic Search"],
    summary="Semantic search over CPCB requirements — JSON body",
)
def search_cpcb(body: Querysearch):
    results = _run_search(query=body.query)
    return Queryrecommend(query=body.query, total_result=len(results), recomendations=results)

@app.get(
    "/cpcb/search",
    response_model=Queryrecommend,
    tags=["CPCB Semantic Search"],
    summary="Semantic search over CPCB requirements — JSON body",
)
def search_cpcb(query: str):
    results = _run_search(query=query)
    return Queryrecommend(query=query, total_result=len(results), recomendations=results)

@app.post(
        "/dgms/search",
        response_model=QuerysearchResponseDGMS,
        tags=["DGMS Semantic Search"],
        summary="Semantic search over DGMS requirements — paste directly in browser",
)
def search_dgms_get(body: QueryDGMS):
    results = _run_search_DGMS(query=body.query)
    return QuerysearchResponseDGMS(query=body.query, total=len(results), results=results)


@app.get(
        "/dgms/search",
        response_model=QuerysearchResponseDGMS,
        tags=["DGMS Semantic Search"],
        summary="Semantic search over DGMS requirements — paste directly in browser",
)
def search_dgms_get(query: str):
    results = _run_search_DGMS(query=query)
    return QuerysearchResponseDGMS(query=query, total=len(results), results=results)



# ── Catch-all for unexpected exceptions ──────────────────────────────────────

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    log.exception("Unhandled exception while processing request.")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=1,
    )
