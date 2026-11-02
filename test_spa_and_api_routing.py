import os
import sys

os.chdir(r"c:\Login")

from starlette.testclient import TestClient
from main import app

print("=" * 70)
print("TESTING SPA & API ROUTING VERIFICATION")
print("=" * 70)

with TestClient(app, raise_server_exceptions=False) as client:
    # 1. Test GET / -> MUST return React index.html
    print("\n1. Testing GET / (Root URL)...")
    res_root = client.get("/")
    assert res_root.status_code == 200, f"Expected 200, got {res_root.status_code}"
    content_type = res_root.headers.get("content-type", "")
    assert "text/html" in content_type, f"Expected text/html, got {content_type}"
    body = res_root.text
    assert '<div id="root"></div>' in body, "React root div not found in /"
    assert "<title>GeoMine AI</title>" in body, "GeoMine AI title not found in /"
    assert "Hello mother-fuckers" not in body, "Old JSON response leaked into /"
    print(f"   [PASS] GET / returned React frontend HTML (length: {len(body)} bytes).")

    # 2. Test GET /dashboard -> MUST return React index.html via SPA catch-all
    print("\n2. Testing GET /dashboard (SPA route)...")
    res_dash = client.get("/dashboard")
    assert res_dash.status_code == 200
    assert "text/html" in res_dash.headers.get("content-type", "")
    assert '<div id="root"></div>' in res_dash.text
    print("   [PASS] GET /dashboard returned React frontend HTML.")

    # 3. Test GET /history with Accept: text/html -> MUST return React index.html
    print("\n3. Testing GET /history with Accept: text/html (Browser navigation)...")
    res_hist_html = client.get("/history", headers={"accept": "text/html,application/xhtml+xml"})
    assert res_hist_html.status_code == 200
    assert "text/html" in res_hist_html.headers.get("content-type", "")
    assert '<div id="root"></div>' in res_hist_html.text
    print("   [PASS] Browser GET /history returned React frontend HTML.")

    # 4. Test GET /assets/* -> MUST return static asset
    print("\n4. Testing GET /assets/index-C3PpArEH.css (Static asset)...")
    res_asset = client.get("/assets/index-C3PpArEH.css")
    assert res_asset.status_code == 200
    assert "text/css" in res_asset.headers.get("content-type", "")
    print(f"   [PASS] Static CSS asset served correctly ({len(res_asset.content)} bytes).")

    # 5. Test GET /health -> MUST return JSON health response
    print("\n5. Testing GET /health (Health check)...")
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert "application/json" in res_health.headers.get("content-type", "")
    data = res_health.json()
    assert data["status"] == "ok"
    assert data["cpcb_rows"] > 0
    assert data["dgms_rows"] > 0
    print(f"   [PASS] GET /health returned JSON health response.")

    # 6. Test /api prefix stripping (e.g. GET /api/me without auth -> 401 JSON)
    print("\n6. Testing /api prefix routing (GET /api/me)...")
    res_api_me = client.get("/api/me")
    assert res_api_me.status_code == 401
    assert res_api_me.json() == {"detail": "Not authenticated"}
    print("   [PASS] GET /api/me routed to @app.get('/me') and returned 401 JSON.")

    # 7. Test POST /api/login reaches validate_login
    print("\n7. Testing POST /api/login routing...")
    res_api_login = client.post("/api/login", json={})
    assert res_api_login.status_code == 422  # Pydantic validation error
    print("   [PASS] POST /api/login routed to @app.post('/login') correctly.")

    # 8. Test unmatched API path returns 404 JSON, NOT HTML
    print("\n8. Testing unmatched API path (GET /cpcb/invalid)...")
    res_invalid_api = client.get("/cpcb/invalid")
    assert res_invalid_api.status_code == 404
    assert res_invalid_api.json() == {"detail": "Not found"}
    print("   [PASS] Unmatched API path returned 404 JSON instead of HTML.")

print("\n" + "=" * 70)
print("ALL SPA AND API ROUTING TESTS PASSED SUCCESSFULLY!")
print("=" * 70)

