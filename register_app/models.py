import json
import threading
import os

FILE = "users.json"

# Module-level lock to serialize all users.json read-modify-write cycles.
# This prevents concurrent requests from corrupting the file.
_file_lock = threading.Lock()


def load_users():
    try:
        with open(FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _write_users(users):
    """Write users list to users.json safely under _file_lock."""
    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=4)


def save_user(user):
    """Thread-safe user saving with auto-increment ID."""
    with _file_lock:
        users = load_users()
        if users:
            user["id"] = users[-1]["id"] + 1
        else:
            user["id"] = 1
        users.append(user)
        _write_users(users)


def update_user_by_id(user_id, update_fn):
    """Thread-safe read-modify-write for a specific user.

    Acquires the file lock, finds the user by ID, calls update_fn(user_dict)
    to mutate the user dict in place, then writes back to disk.

    Returns the updated user dict, or None if user was not found.
    """
    with _file_lock:
        users = load_users()
        target = None
        for u in users:
            if u["id"] == user_id:
                target = u
                break

        if target is None:
            return None

        update_fn(target)
        _write_users(users)
        return target
