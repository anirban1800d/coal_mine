import os
import sys
from urllib.parse import urlparse, parse_qs

os.chdir(r"c:\Login")

from starlette.testclient import TestClient
from starlette.requests import Request
from main import app, get_google_redirect_uri, get_frontend_dashboard_url

print("=" * 70)
print("TESTING GOOGLE OAUTH REDIRECT RESOLUTION")
print("=" * 70)

# Helper to build mock Starlette requests
def make_mock_request(host="localhost:8000", headers=None):
    raw_headers = [(b"host", host.encode())]
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode(), v.encode()))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/login/google",
        "headers": raw_headers,
        "scheme": "https" if "ngrok" in host else "http",
        "server": (host.split(":")[0], int(host.split(":")[1]) if ":" in host else 80),
    }
    return Request(scope)

# TEST 1: Local request resolution
req_local = make_mock_request("localhost:8000")
local_redirect = get_google_redirect_uri(req_local)
local_dashboard = get_frontend_dashboard_url(req_local)
print("\n1. Testing Local Mode Resolution:")
print(f"   Google Callback URI: {local_redirect}")
print(f"   Dashboard Target URI: {local_dashboard}")
assert local_redirect == "http://localhost:8000/auth/google/callback", f"Unexpected local redirect: {local_redirect}"
assert local_dashboard == "http://localhost:5173/dashboard", f"Unexpected local dashboard: {local_dashboard}"
print("   [PASS] Local mode resolves to localhost:8000 callback and localhost:5173 dashboard.")

# TEST 2: Remote ngrok request resolution
req_ngrok = make_mock_request("swarm-duke-kung.ngrok-free.dev", headers={"x-forwarded-proto": "https"})
remote_redirect = get_google_redirect_uri(req_ngrok)
remote_dashboard = get_frontend_dashboard_url(req_ngrok)
print("\n2. Testing Remote ngrok Mode Resolution:")
print(f"   Google Callback URI: {remote_redirect}")
print(f"   Dashboard Target URI: {remote_dashboard}")
assert remote_redirect == "https://swarm-duke-kung.ngrok-free.dev/auth/google/callback", f"Unexpected remote redirect: {remote_redirect}"
assert remote_dashboard == "https://swarm-duke-kung.ngrok-free.dev/dashboard", f"Unexpected remote dashboard: {remote_dashboard}"
print("   [PASS] Remote ngrok mode resolves to https://swarm-duke-kung.ngrok-free.dev callback & dashboard.")

# TEST 3: Verify GET /login/google generates the exact expected Google authorization URL
print("\n3. Testing GET /login/google through TestClient:")
with TestClient(app, raise_server_exceptions=False) as client:
    # A. Local client call
    res_local = client.get("/login/google", follow_redirects=False)
    assert res_local.status_code in (302, 303, 307)
    loc_local = res_local.headers["location"]
    parsed_local = urlparse(loc_local)
    params_local = parse_qs(parsed_local.query)
    assert params_local["redirect_uri"][0] == "http://localhost:8000/auth/google/callback"
    print(f"   [PASS] Local /login/google sent redirect_uri: {params_local['redirect_uri'][0]}")

    # B. ngrok client call
    res_ngrok = client.get(
        "/login/google",
        headers={"host": "swarm-duke-kung.ngrok-free.dev", "x-forwarded-proto": "https"},
        follow_redirects=False,
    )
    assert res_ngrok.status_code in (302, 303, 307)
    loc_ngrok = res_ngrok.headers["location"]
    parsed_ngrok = urlparse(loc_ngrok)
    params_ngrok = parse_qs(parsed_ngrok.query)
    assert params_ngrok["redirect_uri"][0] == "https://swarm-duke-kung.ngrok-free.dev/auth/google/callback"
    print(f"   [PASS] Remote /login/google sent redirect_uri: {params_ngrok['redirect_uri'][0]}")

print("\n" + "=" * 70)
print("ALL GOOGLE OAUTH RESOLUTION TESTS PASSED!")
print("=" * 70)

