import os
import sys
import json
import time
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

os.chdir(r"c:\Login")

from starlette.testclient import TestClient
from main import app
from register_app.models import load_users, _file_lock
import otp_reset.store as otp_store_module
import otp_reset.routes as otp_routes_module

# Backup original users.json content before running tests
with open("users.json", "r", encoding="utf-8") as f:
    ORIGINAL_USERS_BACKUP = json.load(f)

def cleanup_test_users():
    """Restore users.json to the state before these tests."""
    with _file_lock:
        with open("users.json", "w", encoding="utf-8") as f:
            json.dump(ORIGINAL_USERS_BACKUP, f, indent=4)
    print("   Cleaned up test users from users.json.")

print("=" * 70)
print("STARTING FULL INTEGRATION TESTS FOR GEOMINE AI")
print("=" * 70)

try:
    with TestClient(app, raise_server_exceptions=False) as client_a:
        # Create unique test users
        suffix = str(int(time.time()))[-6:]
        user_a_email = f"test_alice_{suffix}@example.com"
        user_b_email = f"test_bob_{suffix}@example.com"
        password_a = "AlicePass12345!@#"
        password_b = "BobPass98765!@#"
        new_password_a = "AliceNewPass67890!@#"

        # -------------------------------------------------------------
        # TEST 1: Register User A
        # -------------------------------------------------------------
        print("\n--- TEST 1: Registration ---")
        reg_payload_a = {
            "name": "Alice",
            "surname": "Miner",
            "Email": user_a_email,
            "PhoneNumber": "+919876543210",
            "Password": password_a
        }
        res = client_a.post("/register", json=reg_payload_a)
        print(f"   Register User A: status={res.status_code}, body={res.text}")
        assert res.status_code == 200, f"Registration failed: {res.text}"
        print("   [PASS] User A registered successfully.")

        # -------------------------------------------------------------
        # TEST 2: Login User A
        # -------------------------------------------------------------
        print("\n--- TEST 2: Login User A ---")
        login_payload_a = {
            "Email": user_a_email,
            "Password": password_a
        }
        res = client_a.post("/login", json=login_payload_a)
        print(f"   Login User A: status={res.status_code}, body={res.text}")
        assert res.status_code == 200, f"Login failed: {res.text}"
        print("   [PASS] User A logged in successfully.")

        # -------------------------------------------------------------
        # TEST 3: Verify /me for User A
        # -------------------------------------------------------------
        print("\n--- TEST 3: /me Session Check ---")
        res = client_a.get("/me")
        print(f"   GET /me: status={res.status_code}, body={res.json()}")
        assert res.status_code == 200
        me_data = res.json()
        assert me_data["email"] == user_a_email
        assert me_data["name"] == "Alice"
        assert "Password" not in me_data and "password" not in me_data, "Password hash must not be exposed in /me!"
        user_a_id = me_data["id"]
        print(f"   [PASS] /me verified for User A (id={user_a_id}). No secrets leaked.")

        # -------------------------------------------------------------
        # TEST 4: User A performs CPCB search
        # -------------------------------------------------------------
        print("\n--- TEST 4: Authenticated CPCB Search ---")
        cpcb_query = "effluent discharge standards"
        res = client_a.post("/cpcb/search", json={"query": cpcb_query})
        print(f"   POST /cpcb/search: status={res.status_code}")
        assert res.status_code == 200, f"CPCB search failed: {res.text}"
        cpcb_data = res.json()
        assert "recomendations" in cpcb_data
        assert cpcb_data["total_result"] > 0
        print(f"   [PASS] CPCB search returned {cpcb_data['total_result']} recommendations.")

        # Also test GET /cpcb/search
        res_get = client_a.get(f"/cpcb/search?query=air+quality")
        assert res_get.status_code == 200
        print(f"   [PASS] GET /cpcb/search returned {res_get.json()['total_result']} recommendations.")

        # -------------------------------------------------------------
        # TEST 5: User A performs DGMS search
        # -------------------------------------------------------------
        print("\n--- TEST 5: Authenticated DGMS Search ---")
        dgms_query = "ventilation in coal mines"
        res = client_a.post("/dgms/search", json={"query": dgms_query})
        print(f"   POST /dgms/search: status={res.status_code}")
        assert res.status_code == 200, f"DGMS search failed: {res.text}"
        dgms_data = res.json()
        assert "results" in dgms_data
        assert dgms_data["total"] > 0
        print(f"   [PASS] DGMS search returned {dgms_data['total']} results.")

        # Also test GET /dgms/search
        res_get_dgms = client_a.get("/dgms/search?query=roof+support")
        assert res_get_dgms.status_code == 200
        print(f"   [PASS] GET /dgms/search returned {res_get_dgms.json()['total']} results.")

        # -------------------------------------------------------------
        # TEST 6: User A checks search history
        # -------------------------------------------------------------
        print("\n--- TEST 6: User A Search History ---")
        res = client_a.get("/history")
        assert res.status_code == 200
        history_list = res.json()
        print(f"   User A history count: {len(history_list)}")
        assert len(history_list) == 4, f"Expected 4 searches in history, found {len(history_list)}"
        
        # Verify summaries don't contain raw 'results' array to keep list payload light
        for item in history_list:
            assert "results" not in item, "History summary should not include large results array"
            assert "id" in item
            assert "domain" in item
            assert "query" in item
            assert "timestamp" in item
            assert "result_count" in item
        print("   [PASS] History summaries correctly structured.")

        # Test GET /history/{id}
        first_entry_id = history_list[0]["id"]
        res_detail = client_a.get(f"/history/{first_entry_id}")
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert "results" in detail_data and len(detail_data["results"]) > 0
        print("   [PASS] History item detail retrieved with full results payload.")

        # -------------------------------------------------------------
        # TEST 7: Register & Login User B (Data Isolation)
        # -------------------------------------------------------------
        print("\n--- TEST 7: Data Isolation with User B ---")
        with TestClient(app, raise_server_exceptions=False) as client_b:
            reg_payload_b = {
                "name": "Bob",
                "surname": "Safety",
                "Email": user_b_email,
                "PhoneNumber": "+919876543211",
                "Password": password_b
            }
            res_b_reg = client_b.post("/register", json=reg_payload_b)
            assert res_b_reg.status_code == 200

            res_b_login = client_b.post("/login", json={"Email": user_b_email, "Password": password_b})
            assert res_b_login.status_code == 200
            print("   User B logged in.")

            # Check User B's history: MUST BE EMPTY!
            res_b_hist = client_b.get("/history")
            assert res_b_hist.status_code == 200
            b_history = res_b_hist.json()
            print(f"   User B history count: {len(b_history)}")
            assert len(b_history) == 0, f"DATA ISOLATION BREACH! User B can see {len(b_history)} items!"
            print("   [PASS] User B cannot see User A's history.")

            # TEST IDOR PREVENTION: User B tries to read User A's history item
            res_idor_get = client_b.get(f"/history/{first_entry_id}")
            print(f"   User B accessing User A item ({first_entry_id}): status={res_idor_get.status_code}")
            assert res_idor_get.status_code == 404, "IDOR VULNERABILITY! User B could access User A's history item!"
            print("   [PASS] IDOR read prevention verified (returned 404).")

            # TEST IDOR PREVENTION: User B tries to delete User A's history item
            res_idor_del = client_b.delete(f"/history/{first_entry_id}")
            print(f"   User B deleting User A item ({first_entry_id}): status={res_idor_del.status_code}")
            assert res_idor_del.status_code == 404, "IDOR VULNERABILITY! User B could delete User A's history item!"
            print("   [PASS] IDOR delete prevention verified (returned 404).")

            # User B does their own search
            client_b.post("/dgms/search", json={"query": "haul road slope"})
            res_b_hist_after = client_b.get("/history")
            assert len(res_b_hist_after.json()) == 1
            print("   [PASS] User B's history contains only User B's search.")

        # -------------------------------------------------------------
        # TEST 8: User A deletes history item
        # -------------------------------------------------------------
        print("\n--- TEST 8: User A Deletes History Item ---")
        res_del = client_a.delete(f"/history/{first_entry_id}")
        assert res_del.status_code == 200
        print("   Deleted history item.")

        res_after_del = client_a.get("/history")
        assert len(res_after_del.json()) == 3
        print("   [PASS] History item deleted. 3 items remain for User A.")

        # -------------------------------------------------------------
        # TEST 9: Logout
        # -------------------------------------------------------------
        print("\n--- TEST 9: Logout ---")
        res_logout = client_a.post("/logout")
        assert res_logout.status_code == 200
        print("   Logged out.")

        # After logout, all protected routes must return 401
        assert client_a.get("/me").status_code == 401
        assert client_a.get("/cpcb/search?query=test").status_code == 401
        assert client_a.get("/dgms/search?query=test").status_code == 401
        assert client_a.get("/history").status_code == 401
        print("   [PASS] Post-logout verification: all protected routes return 401.")

        # -------------------------------------------------------------
        # TEST 10: Forgot Password & OTP Flow
        # -------------------------------------------------------------
        print("\n--- TEST 10: Forgot Password -> OTP -> Reset Password ---")
        # Mock send_otp_email to avoid network calls during automated test
        captured_otp = {}
        def mock_send_otp_email(to_email, otp):
            captured_otp["otp"] = otp
            captured_otp["email"] = to_email

        original_send_func = otp_routes_module.send_otp_email
        otp_routes_module.send_otp_email = mock_send_otp_email

        try:
            # Step 1: Forgot password request
            with TestClient(app, raise_server_exceptions=False) as client_reset:
                res_forgot = client_reset.post("/forgot-password", json={"Email": user_a_email})
                assert res_forgot.status_code == 200
                otp_sent = captured_otp.get("otp")
                assert otp_sent is not None, "OTP was not generated"
                print(f"   OTP generated successfully.")

                # Step 2: Verify OTP
                res_verify = client_reset.post("/verify-otp", json={"Email": user_a_email, "OTP": otp_sent})
                assert res_verify.status_code == 200
                print("   OTP verified successfully.")

                # Step 3: Reset Password
                res_reset = client_reset.post("/reset-password", json={"Email": user_a_email, "NewPassword": new_password_a})
                assert res_reset.status_code == 200
                print("   Password reset successfully.")

                # Step 4: Try login with old password -> should fail
                res_old_login = client_reset.post("/login", json={"Email": user_a_email, "Password": password_a})
                assert res_old_login.status_code == 401
                print("   Old password rejected as expected.")

                # Step 5: Try login with new password -> should succeed
                res_new_login = client_reset.post("/login", json={"Email": user_a_email, "Password": new_password_a})
                assert res_new_login.status_code == 200
                print("   New password accepted! Login succeeded.")
        finally:
            otp_routes_module.send_otp_email = original_send_func

        # -------------------------------------------------------------
        # TEST 11: Concurrent Writes Safety
        # -------------------------------------------------------------
        print("\n--- TEST 11: Concurrent Writes Safety ---")
        with TestClient(app, raise_server_exceptions=False) as client_concurrent:
            client_concurrent.post("/login", json={"Email": user_a_email, "Password": new_password_a})

            def make_search(query_idx):
                client_concurrent.get(f"/cpcb/search?query=concurrent+test+{query_idx}")

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(make_search, i) for i in range(5)]
                for f in futures:
                    f.result()

            # Verify users.json is valid JSON and not corrupted
            all_users = load_users()
            assert isinstance(all_users, list)
            alice = next(u for u in all_users if u["Email"] == user_a_email)
            print(f"   Alice history entries after 5 concurrent searches: {len(alice['query_history'])}")
            print("   [PASS] Concurrent writes completed with zero corruption.")

    print("\n" + "=" * 70)
    print("ALL 11 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

finally:
    cleanup_test_users()

