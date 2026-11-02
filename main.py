# ══════════════════════════════════════════════════════════════════════════════
# GeoMine AI — Unified Backend
# Merges Nexus Auth + Coal Mine RAG Search into a single FastAPI application.
#
# EXISTING AUTH ENDPOINTS: FROZEN — identical logic to the original main.py.
# NEW ADDITIONS: Lifespan (model loading), CPCB/DGMS search, query history.
# ══════════════════════════════════════════════════════════════════════════════

# ── Existing Auth Imports (UNCHANGED) ─────────────────────────────────────────
from register_app.routes import valid_registration
from register_app.schemas import Register_from
from register_app.models import load_users, save_user, update_user_by_id

from Login.schemas import Login_Form
from Login.routes import validate_login

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import os
import uuid
import base64
import cv2
import numpy as np
from pathlib import Path

from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request

from otp_reset.schemas import ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from otp_reset.routes import handle_forgot_password, handle_verify_otp, handle_reset_password

# ── NEW: Search, History & Infrastructure Imports ─────────────────────────────
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np
import pandas as pd
import faiss
import torch
from ultralytics import YOLO
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel

from CPCB.paths import index_path as cpcb_index_path, data_path as cpcb_data_path
from CPCB.Search_cpcb_rag import Search_cpcb_rag
from CPCB.schemas.Querywise_search import Querysearch
from CPCB.schemas.Querysearch_Response import QueryResponse
from CPCB.schemas.Querysearch_recomendations import Queryrecommend

from DGMS.paths import index_path as dgms_index_path, data_path as dgms_data_path
from DGMS.search_dgms_rag import search_dgms
from DGMS.Schemas.Querysearch_Response_DGMS import QuerysearchDGMS
from DGMS.Schemas.Querywise_search_dgms import QueryDGMS
from DGMS.Schemas.Query_recomend_DGMS import QuerysearchResponseDGMS


# ── Environment ───────────────────────────────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("geomine_api")

# ── Search Config ─────────────────────────────────────────────────────────────
DEFAULT_TOP_K_CPCB = 5
DEFAULT_TOP_K_DGMS = 5

# ── PPE Config ────────────────────────────────────────────────────────────────
YOLO_MODEL_PATH = Path(__file__).resolve().parent / "models" / "best.pt"
YOLO_DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

# ── Frontend Dist Paths ───────────────────────────────────────────────────────
_frontend_dist = Path(__file__).resolve().parent / "frontend" / "dist"
_frontend_assets = _frontend_dist / "assets"


# ── Application State (ML models loaded once at startup) ─────────────────────
class AppState:
    """Holds SentenceTransformer model, FAISS indexes, RAG dataframes, and YOLO model."""
    model: Any = None           # Shared SentenceTransformer
    cpcb_index: Any = None      # CPCB FAISS IndexFlatIP
    cpcb_rag_data: Any = None   # CPCB pandas DataFrame
    dgms_index: Any = None      # DGMS FAISS IndexFlatIP
    dgms_rag_data: Any = None   # DGMS pandas DataFrame
    yolo_model: Any = None      # YOLO PPE detection model


state = AppState()


# ── Lifespan: load ML assets once at startup ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading shared SentenceTransformer('all-MiniLM-L6-v2')...")
    state.model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("SentenceTransformer loaded successfully.")

    logger.info("Loading CPCB FAISS index from %s", cpcb_index_path)
    state.cpcb_index = faiss.read_index(str(cpcb_index_path))
    state.cpcb_rag_data = pd.read_csv(str(cpcb_data_path))
    logger.info("CPCB loaded: %d rows, index dimension=%d",
                len(state.cpcb_rag_data), state.cpcb_index.d)

    logger.info("Loading DGMS FAISS index from %s", dgms_index_path)
    state.dgms_index = faiss.read_index(str(dgms_index_path))
    state.dgms_rag_data = pd.read_csv(str(dgms_data_path))
    logger.info("DGMS loaded: %d rows, index dimension=%d",
                len(state.dgms_rag_data), state.dgms_index.d)

    # ── YOLO PPE Detection Model ──────────────────────────────────────────────
    if YOLO_MODEL_PATH.exists():
        logger.info("Loading YOLO PPE model from %s (device=%s)", YOLO_MODEL_PATH, YOLO_DEVICE)
        state.yolo_model = YOLO(str(YOLO_MODEL_PATH))
        logger.info("YOLO model loaded. Classes: %s", state.yolo_model.names)
    else:
        logger.warning("YOLO model not found at %s — PPE detection will be unavailable.", YOLO_MODEL_PATH)

    logger.info("All ML assets loaded. GeoMine API is ready.")
    yield
    logger.info("Shutting down GeoMine API.")


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="GeoMine AI",
    description="Environmental & Mining Compliance Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────
# Build CORS allowed origins. Local dev origins are always included.
# NGROK_ORIGIN (set in .env) is the full HTTPS URL of the ngrok tunnel
# (e.g. https://abc123.ngrok-free.app). Never add wildcards here.
_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_ngrok_origin = os.getenv("NGROK_ORIGIN", "").strip().rstrip("/")
if _ngrok_origin:
    _cors_origins.append(_ngrok_origin)
    logger.info("ngrok origin added to CORS: %s", _ngrok_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTPS_ONLY: set to "true" in .env when running behind ngrok HTTPS so that
# session cookies are marked Secure. Defaults to false so local mode is unaffected.
_https_only = os.getenv("HTTPS_ONLY", "false").lower() == "true"

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    same_site="lax",
    https_only=_https_only,
)


class APIPrefixMiddleware:
    """Transparently strip /api prefix so frontend calls like /api/login,
    /api/me, /api/history match backend routes /login, /me, /history
    when served directly by FastAPI (remote/ngrok mode without Vite proxy).
    Local dev mode with Vite proxy continues working without changes.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path == "/api":
                scope["path"] = "/"
            elif path.startswith("/api/"):
                scope["path"] = path[4:]
        await self.app(scope, receive, send)


app.add_middleware(APIPrefixMiddleware)


# ── OAuth (EXISTING — UNCHANGED) ─────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url=
      "https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope":"openid email profile"
    }
)


# ══════════════════════════════════════════════════════════════════════════════
# HELPER: Get authenticated user from session (NEVER trust frontend user_id)
# ══════════════════════════════════════════════════════════════════════════════

def get_authenticated_user(request: Request) -> dict:
    """Resolve the current user from the server-side session.

    Always determines the user from request.session["user_id"].
    Never accepts a user ID from the request body or query parameters.
    Raises 401 if the session is invalid or the user no longer exists.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    users = load_users()
    for user in users:
        if user["id"] == user_id:
            return user

    # User ID in session but user not found — clear stale session
    request.session.clear()
    raise HTTPException(status_code=401, detail="Session invalid")


# ══════════════════════════════════════════════════════════════════════════════
# EXISTING AUTH ENDPOINTS — FROZEN (identical logic to original main.py)
# ══════════════════════════════════════════════════════════════════════════════

@app.get('/')
def home():
    index_file = _frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"msg":"Hello mother-fuckers"}


@app.post('/register')
def registration(register:Register_from):
    try:
        return valid_registration(register)
    except Exception as e:
        return JSONResponse(status_code=500,content=str(e))

@app.post('/login')
async def login(log:Login_Form,request: Request):
    try:
        result = validate_login(log)
        user_id = result["user_id"]
        request.session["user_id"] = user_id
        request.session["provider"] = "local"  # Store the provider in the session
        return {"message": "Login successful"}
    except HTTPException as e:
        raise e
    except Exception as e:
        return JSONResponse(status_code=401,content={"detail": str(e)})

def get_google_redirect_uri(request: Request) -> str:
    """Resolve Google OAuth callback URI for local or remote (ngrok) mode.

    1. If GOOGLE_REDIRECT_URI in .env is explicitly set to a non-localhost URL, use it.
    2. If request arrived over an ngrok tunnel (or NGROK_ORIGIN is active and request is remote),
       construct https://<ngrok-origin>/auth/google/callback.
    3. Default to GOOGLE_REDIRECT_URI from .env (http://localhost:8000/auth/google/callback).
    """
    env_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip().strip('"').strip("'")

    forwarded_host = request.headers.get("x-forwarded-host", "")
    host = request.headers.get("host", "")
    proto = request.headers.get("x-forwarded-proto", "https")

    is_remote = (
        "ngrok" in forwarded_host
        or "ngrok" in host
        or bool(_ngrok_origin and _ngrok_origin in str(request.base_url))
    )

    if is_remote:
        # If env_uri is explicitly pointing to a remote URL, respect it
        if env_uri and not any(loc in env_uri for loc in ["localhost", "127.0.0.1"]):
            return env_uri
        # Otherwise dynamically construct from NGROK_ORIGIN or request host
        if _ngrok_origin:
            return f"{_ngrok_origin}/auth/google/callback"
        current_host = forwarded_host or host
        return f"{proto}://{current_host}/auth/google/callback"

    return env_uri or "http://localhost:8000/auth/google/callback"


def get_frontend_dashboard_url(request: Request) -> str:
    """Resolve post-login redirect URL for the frontend dashboard.
    In local dev: redirects to http://localhost:5173/dashboard.
    In remote ngrok: redirects to https://<ngrok-origin>/dashboard.
    """
    forwarded_host = request.headers.get("x-forwarded-host", "")
    host = request.headers.get("host", "")
    proto = request.headers.get("x-forwarded-proto", "https")

    is_remote = (
        "ngrok" in forwarded_host
        or "ngrok" in host
        or bool(_ngrok_origin and _ngrok_origin in str(request.base_url))
    )

    if is_remote:
        if _ngrok_origin:
            return f"{_ngrok_origin}/dashboard"
        current_host = forwarded_host or host
        return f"{proto}://{current_host}/dashboard"

    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/") + "/dashboard"


@app.get("/login/google")
async def google_login(request: Request):
    redirect_uri = get_google_redirect_uri(request)
    logger.info("Initiating Google OAuth with redirect_uri: %s", redirect_uri)
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri
    )


@app.get("/auth/google/callback")
async def google_callback(request: Request):

    try:
        token = await oauth.google.authorize_access_token(request)

        user_info = token.get("userinfo")

        if not user_info:
            raise Exception("userinfo was not returned by Google")

        email = user_info["email"]
        name = user_info.get("name", "Google User")

        users = load_users()

        existing_user = None

        for u in users:
            if u["Email"] == email:
                existing_user = u
                break

        if not existing_user:

            name_parts = name.split()

            google_user = {
                "id": str(uuid.uuid4()),
                "name": " ".join(name_parts[:-1]) if len(name_parts) > 1 else name,
                "surname": name_parts[-1] if len(name_parts) > 1 else "",
                "Email": email,
                "PhoneNumber": "",
                "Password": "",
                "provider": "google"
            }

            save_user(google_user)

            existing_user = google_user

        # Store logged-in user in session
        request.session["user_id"] = existing_user["id"]
        request.session["email"] = existing_user["Email"]
        request.session["provider"] = "local"  

        dashboard_url = get_frontend_dashboard_url(request)
        logger.info("Google OAuth login successful for %s. Redirecting to %s", email, dashboard_url)
        return RedirectResponse(url=dashboard_url)
    except Exception as e:
        print("GOOGLE CALLBACK ERROR:")
        print(type(e).__name__)
        print(str(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/me")
async def get_current_user(request: Request):
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    users = load_users()

    for user in users:
        if user["id"] == user_id:
            return {
                "id": user["id"],
                "name": user["name"],
                "surname": user["surname"],
                "email": user["Email"],
                "provider": user.get("provider", "local")
            }
    request.session.clear()

    raise HTTPException(
        status_code=404,
        detail="User not found"
    )


# ─── Logout (EXISTING — UNCHANGED) ───
@app.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logout successful"}


# ─── Forgot Password (EXISTING — UNCHANGED) ───
@app.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, request: Request):
    try:
        return handle_forgot_password(body.Email, request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Verify OTP (EXISTING — UNCHANGED) ───
@app.post("/verify-otp")
async def verify_otp(body: VerifyOTPRequest, request: Request):
    try:
        return handle_verify_otp(body.Email, body.OTP, request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Reset Password (EXISTING — UNCHANGED) ───
@app.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, request: Request):
    try:
        return handle_reset_password(body.Email, body.NewPassword, request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════════════════
# NEW: CPCB / DGMS SEARCH ENDPOINTS (session-protected)
# ══════════════════════════════════════════════════════════════════════════════

# ── Core search helpers (logic from coal_main.py, unchanged) ─────────────────

def _run_search_cpcb(query: str, k: int = DEFAULT_TOP_K_CPCB) -> list[QueryResponse]:
    """Execute CPCB semantic search. Reuses loaded model/index/data."""
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")
    if state.model is None or state.cpcb_index is None or state.cpcb_rag_data is None:
        raise HTTPException(status_code=503, detail="CPCB search service not ready.")

    try:
        raw_results = Search_cpcb_rag(
            query=query,
            embedding=state.model,
            index=state.cpcb_index,
            df_rag=state.cpcb_rag_data,
            k=k,
        )
    except Exception as exc:
        logger.exception("Search_cpcb_rag failed for query: %s", query)
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}") from exc

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
        logger.exception("Unexpected CPCB result format.")
        raise HTTPException(status_code=500, detail=f"Unexpected search result format: {exc}") from exc


def _run_search_dgms(query: str, k: int = DEFAULT_TOP_K_DGMS) -> list[QuerysearchDGMS]:
    """Execute DGMS semantic search. Reuses loaded model/index/data."""
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")
    if state.model is None or state.dgms_index is None or state.dgms_rag_data is None:
        raise HTTPException(status_code=503, detail="DGMS search service not ready.")

    try:
        raw_results = search_dgms(
            query=query,
            embedding_model=state.model,
            index=state.dgms_index,
            df=state.dgms_rag_data,
            k=k,
        )
    except Exception as exc:
        logger.exception("search_dgms failed for query: %s", query)
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}") from exc

    try:
        return [QuerysearchDGMS.model_validate(item) for item in raw_results]
    except (KeyError, TypeError, ValueError) as exc:
        logger.exception("Unexpected DGMS result format.")
        raise HTTPException(status_code=500, detail=f"Unexpected search result format: {exc}") from exc


# ── Save query to user's history ─────────────────────────────────────────────

def _save_to_history(user_id, domain: str, query: str, results: list):
    """Append a search query+results to the user's query_history in users.json.

    Thread-safe via update_user_by_id which acquires the file lock.
    """
    history_entry = {
        "id": str(uuid.uuid4()),
        "domain": domain,
        "query": query,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "result_count": len(results),
        "results": results,
    }

    def append_history(user_dict):
        if "query_history" not in user_dict:
            user_dict["query_history"] = []
        user_dict["query_history"].append(history_entry)

    update_user_by_id(user_id, append_history)
    return history_entry["id"]


# ── CPCB Search Endpoints ────────────────────────────────────────────────────

@app.post(
    "/cpcb/search",
    response_model=Queryrecommend,
    tags=["CPCB Semantic Search"],
    summary="Semantic search over CPCB requirements (authenticated)",
)
def search_cpcb_post(body: Querysearch, request: Request):
    user = get_authenticated_user(request)
    results = _run_search_cpcb(query=body.query)
    response = Queryrecommend(query=body.query, total_result=len(results), recomendations=results)

    # Save to history (serialize Pydantic models to dicts)
    results_dicts = [r.model_dump() for r in results]
    _save_to_history(user["id"], "CPCB", body.query, results_dicts)

    return response


@app.get(
    "/cpcb/search",
    response_model=Queryrecommend,
    tags=["CPCB Semantic Search"],
    summary="Semantic search over CPCB requirements — query param (authenticated)",
)
def search_cpcb_get(query: str, request: Request):
    user = get_authenticated_user(request)
    results = _run_search_cpcb(query=query)
    response = Queryrecommend(query=query, total_result=len(results), recomendations=results)

    results_dicts = [r.model_dump() for r in results]
    _save_to_history(user["id"], "CPCB", query, results_dicts)

    return response


# ── DGMS Search Endpoints ────────────────────────────────────────────────────

@app.post(
    "/dgms/search",
    response_model=QuerysearchResponseDGMS,
    tags=["DGMS Semantic Search"],
    summary="Semantic search over DGMS requirements (authenticated)",
)
def search_dgms_post(body: QueryDGMS, request: Request):
    user = get_authenticated_user(request)
    results = _run_search_dgms(query=body.query)
    response = QuerysearchResponseDGMS(query=body.query, total=len(results), results=results)

    results_dicts = [r.model_dump(by_alias=True) for r in results]
    _save_to_history(user["id"], "DGMS", body.query, results_dicts)

    return response


@app.get(
    "/dgms/search",
    response_model=QuerysearchResponseDGMS,
    tags=["DGMS Semantic Search"],
    summary="Semantic search over DGMS requirements — query param (authenticated)",
)
def search_dgms_get(query: str, request: Request):
    user = get_authenticated_user(request)
    results = _run_search_dgms(query=query)
    response = QuerysearchResponseDGMS(query=query, total=len(results), results=results)

    results_dicts = [r.model_dump(by_alias=True) for r in results]
    _save_to_history(user["id"], "DGMS", query, results_dicts)

    return response


# ══════════════════════════════════════════════════════════════════════════════
# NEW: QUERY HISTORY ENDPOINTS (session-protected, user-isolated)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/history", tags=["Query History"])
async def get_history(request: Request):
    """Return the current user's query history (without full result payloads)."""
    # If a browser is directly navigating to or refreshing /history, serve the SPA HTML
    if "text/html" in request.headers.get("accept", ""):
        index_file = _frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))

    user = get_authenticated_user(request)
    history = user.get("query_history", [])

    # Return summaries (without the large 'results' arrays) for the list view
    return [
        {
            "id": entry["id"],
            "domain": entry["domain"],
            "query": entry["query"],
            "timestamp": entry["timestamp"],
            "result_count": entry.get("result_count", len(entry.get("results", []))),
        }
        for entry in reversed(history)  # newest first
    ]


@app.get("/history/{history_id}", tags=["Query History"])
async def get_history_item(history_id: str, request: Request):
    """Return a specific history entry (with full results) for the current user."""
    user = get_authenticated_user(request)
    history = user.get("query_history", [])

    for entry in history:
        if entry["id"] == history_id:
            return entry

    raise HTTPException(status_code=404, detail="History entry not found")


@app.delete("/history/{history_id}", tags=["Query History"])
async def delete_history_item(history_id: str, request: Request):
    """Delete a specific history entry belonging to the current user."""
    user = get_authenticated_user(request)
    user_id = user["id"]

    deleted = False

    def remove_entry(user_dict):
        nonlocal deleted
        hist = user_dict.get("query_history", [])
        original_len = len(hist)
        user_dict["query_history"] = [e for e in hist if e["id"] != history_id]
        deleted = original_len != len(user_dict["query_history"])

    update_user_by_id(user_id, remove_entry)

    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found")

    return {"message": "History entry deleted"}


# ══════════════════════════════════════════════════════════════════════════════
# NEW: PPE REAL-TIME DETECTION (WebSocket, session-protected)
# ══════════════════════════════════════════════════════════════════════════════

class PPESaveRequest(BaseModel):
    """Body for saving a completed PPE detection session."""
    duration: int                # seconds the session ran
    detection_count: int         # total unique class instances seen
    detections: list             # [{class_name, confidence}, ...]


def _save_ppe_session(user_id, duration: int, detection_count: int, detections: list) -> str:
    """Append one aggregated PPE session record to user's ppe_history in users.json.

    Thread-safe via update_user_by_id which acquires the file lock.
    Never stores base64 images — only metadata.
    """
    entry = {
        "id": f"ppe_{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration": duration,
        "detection_count": detection_count,
        "detections": detections,
    }

    def append_ppe(user_dict):
        if "ppe_history" not in user_dict:
            user_dict["ppe_history"] = []
        user_dict["ppe_history"].append(entry)

    update_user_by_id(user_id, append_ppe)
    return entry["id"]


@app.websocket("/ws/detect")
async def detect_camera(websocket: WebSocket):
    """Authenticated real-time PPE detection via WebSocket.

    Authentication: reads user_id from the server-side session cookie.
    Rejects unauthenticated connections with close code 4001.
    Receives base64-encoded JPEG frames, returns annotated JPEG + detections.
    """
    user_id = websocket.session.get("user_id")
    if not user_id:
        logger.warning("PPE WebSocket rejected: no session user_id")
        await websocket.close(code=4001)
        return

    if state.yolo_model is None:
        logger.error("PPE WebSocket rejected: YOLO model not loaded")
        await websocket.close(code=4002)
        return

    await websocket.accept()
    logger.info("PPE WebSocket connected for user_id=%s", user_id)

    try:
        while True:
            # Receive base64 image from frontend
            image_data = await websocket.receive_text()

            # Strip data URL prefix if present
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]

            # Decode base64 → numpy array → OpenCV frame
            image_bytes = base64.b64decode(image_data)
            np_array = np.frombuffer(image_bytes, dtype=np.uint8)
            frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"error": "Invalid image frame"})
                continue

            # Run YOLO inference (same params as main_ppe.py)
            results = state.yolo_model.predict(
                source=frame,
                imgsz=640,
                conf=0.05,
                iou=0.45,
                max_det=100,
                device=YOLO_DEVICE,
                verbose=False,
            )

            result = results[0]

            # Draw annotated bounding boxes
            annotated_frame = result.plot()

            detections = []
            if result.boxes is not None:
                for box in result.boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    detections.append({
                        "class_id": class_id,
                        "class_name": state.yolo_model.names[class_id],
                        "confidence": round(confidence, 3),
                        "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    })

            # Encode annotated frame back to JPEG base64
            success, encoded_image = cv2.imencode(
                ".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80]
            )
            if not success:
                continue

            output_base64 = base64.b64encode(encoded_image.tobytes()).decode("utf-8")

            await websocket.send_json({
                "image": output_base64,
                "detections": detections,
            })

    except WebSocketDisconnect:
        logger.info("PPE WebSocket disconnected for user_id=%s", user_id)
    except Exception as error:
        logger.error("PPE detection error for user_id=%s: %r", user_id, error)
        try:
            await websocket.close()
        except Exception:
            pass


@app.post("/ppe/save-session", tags=["PPE Detection"])
async def save_ppe_session(body: PPESaveRequest, request: Request):
    """Save an aggregated PPE detection session record for the authenticated user.

    Called by the frontend when the user stops the camera.
    Never stores base64 images — only class names, confidence, duration, count.
    """
    user = get_authenticated_user(request)

    # Sanitise detections: only keep class_name and confidence
    safe_detections = [
        {"class_name": str(d.get("class_name", ""))[:64], "confidence": float(d.get("confidence", 0.0))}
        for d in body.detections
        if isinstance(d, dict)
    ]

    session_id = _save_ppe_session(
        user_id=user["id"],
        duration=body.duration,
        detection_count=body.detection_count,
        detections=safe_detections,
    )

    logger.info(
        "PPE session saved for user_id=%s: id=%s, duration=%ds, detections=%d",
        user["id"], session_id, body.duration, body.detection_count,
    )
    return {"message": "PPE session saved", "id": session_id}


@app.get("/ppe/history", tags=["PPE Detection"])
async def get_ppe_history(request: Request):
    """Return the current user's PPE detection session history (summaries only)."""
    user = get_authenticated_user(request)
    ppe_history = user.get("ppe_history", [])

    return [
        {
            "id": entry["id"],
            "timestamp": entry["timestamp"],
            "duration": entry.get("duration", 0),
            "detection_count": entry.get("detection_count", 0),
        }
        for entry in reversed(ppe_history)  # newest first
    ]


@app.get("/ppe/history/{session_id}", tags=["PPE Detection"])
async def get_ppe_history_item(session_id: str, request: Request):
    """Return a specific PPE session record (with detections) for the current user."""
    user = get_authenticated_user(request)
    ppe_history = user.get("ppe_history", [])

    for entry in ppe_history:
        if entry["id"] == session_id:
            return entry

    raise HTTPException(status_code=404, detail="PPE session not found")


@app.delete("/ppe/history/{session_id}", tags=["PPE Detection"])
async def delete_ppe_history_item(session_id: str, request: Request):
    """Delete a specific PPE session record belonging to the current user."""
    user = get_authenticated_user(request)
    user_id = user["id"]

    deleted = False

    def remove_ppe_entry(user_dict):
        nonlocal deleted
        hist = user_dict.get("ppe_history", [])
        original_len = len(hist)
        user_dict["ppe_history"] = [e for e in hist if e["id"] != session_id]
        deleted = original_len != len(user_dict["ppe_history"])

    update_user_by_id(user_id, remove_ppe_entry)

    if not deleted:
        raise HTTPException(status_code=404, detail="PPE session not found")

    return {"message": "PPE session deleted"}



# ══════════════════════════════════════════════════════════════════════════════
# NEW: HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    cpcb_index_loaded: bool
    cpcb_rows: int
    dgms_index_loaded: bool
    dgms_rows: int


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Check that all ML assets are loaded and the API is operational."""
    return HealthResponse(
        status="ok",
        model_loaded=state.model is not None,
        cpcb_index_loaded=state.cpcb_index is not None,
        cpcb_rows=len(state.cpcb_rag_data) if state.cpcb_rag_data is not None else 0,
        dgms_index_loaded=state.dgms_index is not None,
        dgms_rows=len(state.dgms_rag_data) if state.dgms_rag_data is not None else 0,
    )


# ── Catch-all for unexpected exceptions ──────────────────────────────────────

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logger.exception("Unhandled exception while processing request.")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )


# ══════════════════════════════════════════════════════════════════════════════
# OPTIONAL STATIC FILE SERVING (Remote / ngrok mode)
# When `npm run build` has been run in frontend/, FastAPI serves the built
# frontend from frontend/dist. This enables a SINGLE ngrok tunnel on port 8000
# to serve both the API and the SPA.
#
# Local Vite dev server (npm run dev) is completely UNAFFECTED — this block
# only activates when frontend/dist exists.
# ══════════════════════════════════════════════════════════════════════════════
if _frontend_dist.exists() and _frontend_assets.exists():
    app.mount("/assets", StaticFiles(directory=str(_frontend_assets)), name="frontend-assets")
    logger.info("Frontend dist found — serving static files from %s", _frontend_dist)

    # SPA catch-all: registered LAST so all API routes (/cpcb, /dgms, /ppe, /health, etc.)
    # take priority. Handles frontend routes like /dashboard, /history, /login, etc.
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # API route prefixes that did not match any endpoint should return 404 JSON, not HTML
        if full_path.startswith(("api/", "cpcb/", "dgms/", "ppe/")):
            return JSONResponse({"detail": "Not found"}, status_code=404)

        # Check if direct static file exists in frontend/dist (e.g. favicon.svg, icons.svg)
        target_file = _frontend_dist / full_path
        if target_file.is_file():
            return FileResponse(str(target_file))

        # Otherwise serve index.html for SPA routes (e.g. /dashboard, /login)
        index_file = _frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse(
            {"detail": "Frontend not built. Run: cd frontend && npm run build"},
            status_code=404,
        )

else:
    logger.info(
        "No frontend/dist found — static serving disabled. "
        "Run `cd frontend && npm run build` to enable remote/ngrok mode."
    )
