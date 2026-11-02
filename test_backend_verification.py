import sys
import os

# Ensure we're in the right directory
os.chdir(r"c:\Login")

print("1. Testing models.py imports...")
from register_app.models import load_users, save_user, update_user_by_id, _file_lock
users = load_users()
print(f"   load_users loaded {len(users)} users successfully.")
assert callable(update_user_by_id), "update_user_by_id must be callable"
assert _file_lock is not None, "_file_lock must be initialized"
print("   models.py verification PASSED.")

print("\n2. Testing main.py imports and routes inspection...")
from main import app, state

# Inspect route names
route_paths = [route.path for route in app.routes]
print(f"   Found {len(route_paths)} registered routes:")
for p in sorted(set(route_paths)):
    print(f"     {p}")

required_routes = [
    "/", "/register", "/login", "/login/google", "/auth/google/callback",
    "/me", "/logout", "/forgot-password", "/verify-otp", "/reset-password",
    "/cpcb/search", "/dgms/search", "/history", "/history/{history_id}", "/health",
    "/ppe/save-session", "/ppe/history", "/ppe/history/{session_id}", "/ws/detect",
]

missing = [r for r in required_routes if r not in route_paths]
assert not missing, f"Missing routes: {missing}"
print("   All required routes are present.")

print("\n3. Testing unauthenticated access protection (expecting 401)...")
from starlette.testclient import TestClient

# We can test without entering lifespan first to verify auth gates don't even reach search models:
with TestClient(app, raise_server_exceptions=False) as client:
    # Test health check
    res_health = client.get("/health")
    print(f"   GET /health -> {res_health.status_code}")
    
    # Test unauthenticated /me
    res_me = client.get("/me")
    print(f"   GET /me -> {res_me.status_code} ({res_me.json()})")
    assert res_me.status_code == 401, f"Expected 401 on unauthenticated /me, got {res_me.status_code}"
    
    # Test unauthenticated /cpcb/search
    res_cpcb_get = client.get("/cpcb/search?query=pollution")
    print(f"   GET /cpcb/search -> {res_cpcb_get.status_code} ({res_cpcb_get.json()})")
    assert res_cpcb_get.status_code == 401, f"Expected 401 on unauthenticated CPCB search, got {res_cpcb_get.status_code}"
    
    res_cpcb_post = client.post("/cpcb/search", json={"query": "pollution"})
    print(f"   POST /cpcb/search -> {res_cpcb_post.status_code} ({res_cpcb_post.json()})")
    assert res_cpcb_post.status_code == 401, f"Expected 401 on unauthenticated CPCB search, got {res_cpcb_post.status_code}"

    # Test unauthenticated /dgms/search
    res_dgms_get = client.get("/dgms/search?query=safety")
    print(f"   GET /dgms/search -> {res_dgms_get.status_code} ({res_dgms_get.json()})")
    assert res_dgms_get.status_code == 401, f"Expected 401 on unauthenticated DGMS search, got {res_dgms_get.status_code}"

    res_dgms_post = client.post("/dgms/search", json={"query": "safety"})
    print(f"   POST /dgms/search -> {res_dgms_post.status_code} ({res_dgms_post.json()})")
    assert res_dgms_post.status_code == 401, f"Expected 401 on unauthenticated DGMS search, got {res_dgms_post.status_code}"

    # Test unauthenticated /history
    res_hist = client.get("/history")
    print(f"   GET /history -> {res_hist.status_code} ({res_hist.json()})")
    assert res_hist.status_code == 401, f"Expected 401 on unauthenticated /history, got {res_hist.status_code}"

    res_hist_item = client.get("/history/some-id")
    print(f"   GET /history/some-id -> {res_hist_item.status_code} ({res_hist_item.json()})")
    assert res_hist_item.status_code == 401, f"Expected 401 on unauthenticated /history/id, got {res_hist_item.status_code}"

    res_hist_del = client.delete("/history/some-id")
    print(f"   DELETE /history/some-id -> {res_hist_del.status_code} ({res_hist_del.json()})")
    assert res_hist_del.status_code == 401, f"Expected 401 on unauthenticated DELETE /history/id, got {res_hist_del.status_code}"

    # PPE protection tests
    res_ppe_save = client.post("/ppe/save-session", json={"duration": 10, "detection_count": 1, "detections": []})
    print(f"   POST /ppe/save-session -> {res_ppe_save.status_code} ({res_ppe_save.json()})")
    assert res_ppe_save.status_code == 401, f"Expected 401 on unauthenticated /ppe/save-session, got {res_ppe_save.status_code}"

    res_ppe_hist = client.get("/ppe/history")
    print(f"   GET /ppe/history -> {res_ppe_hist.status_code} ({res_ppe_hist.json()})")
    assert res_ppe_hist.status_code == 401, f"Expected 401 on unauthenticated /ppe/history, got {res_ppe_hist.status_code}"

    res_ppe_hist_item = client.get("/ppe/history/ppe_abc123")
    print(f"   GET /ppe/history/ppe_abc123 -> {res_ppe_hist_item.status_code} ({res_ppe_hist_item.json()})")
    assert res_ppe_hist_item.status_code == 401, f"Expected 401 on unauthenticated /ppe/history/id, got {res_ppe_hist_item.status_code}"

    res_ppe_del = client.delete("/ppe/history/ppe_abc123")
    print(f"   DELETE /ppe/history/ppe_abc123 -> {res_ppe_del.status_code} ({res_ppe_del.json()})")
    assert res_ppe_del.status_code == 401, f"Expected 401 on unauthenticated DELETE /ppe/history/id, got {res_ppe_del.status_code}"

print("   All unauthenticated protection tests PASSED!")

