import uvicorn
import threading
import time
import urllib.request
import os

os.chdir(r"c:\Login")

from main import app

# Start uvicorn on port 8008 in a background thread
server_thread = threading.Thread(
    target=uvicorn.run,
    args=(app,),
    kwargs={"host": "127.0.0.1", "port": 8008, "log_level": "warning"},
    daemon=True,
)
server_thread.start()

# Poll until server is ready (models take ~15-20s to load on CPU)
print("Waiting for server to start...")
html_content = ""
status = 0
headers = {}

for attempt in range(40):
    time.sleep(1)
    try:
        with urllib.request.urlopen("http://127.0.0.1:8008/") as response:
            status = response.status
            headers = dict(response.getheaders())
            html_content = response.read().decode("utf-8")
            break
    except Exception:
        continue

print(f"\nHTTP Status: {status}")
print(f"Content-Type: {headers.get('content-type', '')}")
assert status == 200
assert "text/html" in headers.get("content-type", "")
assert '<div id="root"></div>' in html_content
assert "<title>GeoMine AI</title>" in html_content
assert "Hello mother-fuckers" not in html_content

print("CONFIRMED: Live HTTP request to / returns React index.html!")
print("ALL LIVE VERIFICATIONS PASSED!")
