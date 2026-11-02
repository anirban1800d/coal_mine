import os
import sys
import json
import time
import base64
import cv2
import numpy as np

os.chdir(r"c:\Login")

from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from main import app
from register_app.models import load_users, _file_lock

# Backup original users.json
with open("users.json", "r", encoding="utf-8") as f:
    ORIGINAL_USERS_BACKUP = json.load(f)

def cleanup_test_users():
    with _file_lock:
        with open("users.json", "w", encoding="utf-8") as f:
            json.dump(ORIGINAL_USERS_BACKUP, f, indent=4)
    print("   Cleaned up test users from users.json.")

print("=" * 70)
print("STARTING PPE VERIFICATION TEST SUITE")
print("=" * 70)

try:
    suffix = str(int(time.time()))[-6:]
    user_a_email = f"ppe_alice_{suffix}@example.com"
    user_b_email = f"ppe_bob_{suffix}@example.com"
    password_a = "AlicePPEPass12345!@#"
    password_b = "BobPPEPass54321!@#"

    with TestClient(app, raise_server_exceptions=False) as client_a:
        # Register User A
        reg_res = client_a.post("/register", json={
            "name": "Alice", "surname": "Worker",
            "Email": user_a_email, "PhoneNumber": "+919876543220",
            "Password": password_a
        })
        assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"

        # -------------------------------------------------------------
        # TEST 1: Unauthenticated WebSocket rejected
        # -------------------------------------------------------------
        print("\n--- TEST 1: Unauthenticated WebSocket Gate ---")
        with TestClient(app, raise_server_exceptions=False) as unauth_client:
            rejected = False
            try:
                with unauth_client.websocket_connect("/ws/detect") as ws:
                    ws.send_text("dummy")
                    ws.receive_text()
            except Exception as e:
                rejected = True
                print(f"   Unauthenticated WebSocket rejected as expected ({type(e).__name__}).")
            assert rejected, "Security breach! Unauthenticated WebSocket was NOT rejected!"
            print("   [PASS] Unauthenticated WebSocket connection rejected.")

        # -------------------------------------------------------------
        # TEST 2: Login User A and Authenticated WebSocket Communication
        # -------------------------------------------------------------
        print("\n--- TEST 2: Authenticated WebSocket & Inference ---")
        login_res = client_a.post("/login", json={"Email": user_a_email, "Password": password_a})
        assert login_res.status_code == 200
        print("   User A logged in successfully.")

        # Create a test synthetic JPEG image (640x480 RGB)
        dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Draw a shape to make it a valid non-empty visual frame
        cv2.putText(dummy_img, "PPE TEST", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        _, encoded_jpeg = cv2.imencode(".jpg", dummy_img)
        raw_b64 = base64.b64encode(encoded_jpeg.tobytes()).decode("utf-8")
        data_url_b64 = f"data:image/jpeg;base64,{raw_b64}"

        with client_a.websocket_connect("/ws/detect") as ws:
            print("   Authenticated WebSocket connected successfully!")
            
            # Send frame 1: raw base64
            ws.send_text(raw_b64)
            data1 = ws.receive_json()
            assert "image" in data1, "Response missing annotated 'image' field"
            assert "detections" in data1, "Response missing 'detections' field"
            assert isinstance(data1["detections"], list)
            print(f"   Frame 1 processed: output image len={len(data1['image'])}, detections={len(data1['detections'])}")

            # Send frame 2: data URL base64
            ws.send_text(data_url_b64)
            data2 = ws.receive_json()
            assert "image" in data2
            assert "detections" in data2
            print(f"   Frame 2 (Data URL) processed successfully!")

        print("   [PASS] Authenticated WebSocket communication & YOLO inference verified.")

        # -------------------------------------------------------------
        # TEST 3: PPE Detection Session & History Behavior
        # -------------------------------------------------------------
        print("\n--- TEST 3: PPE Session Save & History Retrieval ---")
        sample_detections = [
            {"class_name": "helmet", "confidence": 0.95},
            {"class_name": "vest", "confidence": 0.89},
            {"class_name": "boots", "confidence": 0.91}
        ]
        save_payload = {
            "duration": 45,
            "detection_count": 3,
            "detections": sample_detections
        }
        res_save = client_a.post("/ppe/save-session", json=save_payload)
        assert res_save.status_code == 200, f"Save session failed: {res_save.text}"
        save_resp = res_save.json()
        assert "id" in save_resp
        session_a_id = save_resp["id"]
        print(f"   PPE session saved successfully with ID: {session_a_id}")

        # Verify users.json on disk contains NO base64 images
        users_on_disk = load_users()
        alice_on_disk = next(u for u in users_on_disk if u["Email"] == user_a_email)
        assert "ppe_history" in alice_on_disk, "ppe_history missing in user record"
        saved_entry = next(e for e in alice_on_disk["ppe_history"] if e["id"] == session_a_id)
        assert saved_entry["duration"] == 45
        assert saved_entry["detection_count"] == 3
        assert len(saved_entry["detections"]) == 3
        # Ensure no base64 images exist anywhere in the saved record
        serialized_entry = json.dumps(saved_entry)
        assert "data:image" not in serialized_entry
        assert len(serialized_entry) < 1000, f"PPE record unexpectedly large ({len(serialized_entry)} bytes)!"
        print("   [PASS] Session saved cleanly without storing base64 frames.")

        # Test GET /ppe/history
        res_hist = client_a.get("/ppe/history")
        assert res_hist.status_code == 200
        hist_list = res_hist.json()
        assert len(hist_list) == 1
        summary = hist_list[0]
        assert summary["id"] == session_a_id
        assert summary["duration"] == 45
        assert summary["detection_count"] == 3
        assert "timestamp" in summary
        print("   [PASS] GET /ppe/history returned session summary.")

        # Test GET /ppe/history/{session_id}
        res_item = client_a.get(f"/ppe/history/{session_a_id}")
        assert res_item.status_code == 200
        detail = res_item.json()
        assert detail["id"] == session_a_id
        assert "detections" in detail
        assert len(detail["detections"]) == 3
        assert detail["detections"][0]["class_name"] == "helmet"
        print("   [PASS] GET /ppe/history/{id} returned full detection details.")

        # -------------------------------------------------------------
        # TEST 4: PPE History Ownership Isolation & IDOR Prevention
        # -------------------------------------------------------------
        print("\n--- TEST 4: Data Isolation & IDOR Prevention with User B ---")
        with TestClient(app, raise_server_exceptions=False) as client_b:
            reg_b = client_b.post("/register", json={
                "name": "Bob", "surname": "Inspector",
                "Email": user_b_email, "PhoneNumber": "+919876543221",
                "Password": password_b
            })
            assert reg_b.status_code == 200
            login_b = client_b.post("/login", json={"Email": user_b_email, "Password": password_b})
            assert login_b.status_code == 200
            print("   User B logged in.")

            # User B checks PPE history: MUST BE EMPTY!
            b_hist_res = client_b.get("/ppe/history")
            assert b_hist_res.status_code == 200
            assert len(b_hist_res.json()) == 0, "DATA ISOLATION BREACH! User B saw User A's PPE history!"
            print("   [PASS] User B cannot see User A's PPE history.")

            # User B attempts to view User A's PPE session (IDOR read)
            idor_get = client_b.get(f"/ppe/history/{session_a_id}")
            print(f"   User B accessing User A PPE session ({session_a_id}): status={idor_get.status_code}")
            assert idor_get.status_code == 404, "IDOR VULNERABILITY! User B could read User A's PPE session!"
            print("   [PASS] IDOR read prevention verified (returned 404).")

            # User B attempts to delete User A's PPE session (IDOR delete)
            idor_del = client_b.delete(f"/ppe/history/{session_a_id}")
            print(f"   User B deleting User A PPE session ({session_a_id}): status={idor_del.status_code}")
            assert idor_del.status_code == 404, "IDOR VULNERABILITY! User B could delete User A's PPE session!"
            print("   [PASS] IDOR delete prevention verified (returned 404).")

            # User B saves their own PPE session
            b_save = client_b.post("/ppe/save-session", json={
                "duration": 15, "detection_count": 1,
                "detections": [{"class_name": "goggles", "confidence": 0.85}]
            })
            assert b_save.status_code == 200
            b_session_id = b_save.json()["id"]

            # User B now has 1 session, User A still has 1 session
            b_hist_after = client_b.get("/ppe/history")
            assert len(b_hist_after.json()) == 1
            assert b_hist_after.json()[0]["id"] == b_session_id
            print("   [PASS] User B has their own distinct PPE history.")

        # -------------------------------------------------------------
        # TEST 5: PPE Deletion
        # -------------------------------------------------------------
        print("\n--- TEST 5: PPE Deletion ---")
        # User A deletes their session
        del_res = client_a.delete(f"/ppe/history/{session_a_id}")
        assert del_res.status_code == 200
        print(f"   Deleted session {session_a_id}.")

        # Verify history is now empty for User A
        res_hist_after_del = client_a.get("/ppe/history")
        assert len(res_hist_after_del.json()) == 0
        print("   [PASS] PPE history list is empty after deletion.")

        # Verify GET by ID now returns 404
        assert client_a.get(f"/ppe/history/{session_a_id}").status_code == 404
        # Verify repeat DELETE returns 404
        assert client_a.delete(f"/ppe/history/{session_a_id}").status_code == 404
        print("   [PASS] Subsequent GET and DELETE return 404.")

        # -------------------------------------------------------------
        # TEST 6: Logout Protection on PPE Endpoints
        # -------------------------------------------------------------
        print("\n--- TEST 6: Post-Logout Protection on PPE Endpoints ---")
        client_a.post("/logout")
        assert client_a.get("/ppe/history").status_code == 401
        assert client_a.get(f"/ppe/history/{session_a_id}").status_code == 401
        assert client_a.delete(f"/ppe/history/{session_a_id}").status_code == 401
        assert client_a.post("/ppe/save-session", json=save_payload).status_code == 401
        print("   [PASS] All PPE endpoints enforce 401 after logout.")

    print("\n" + "=" * 70)
    print("ALL PPE INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

finally:
    cleanup_test_users()
