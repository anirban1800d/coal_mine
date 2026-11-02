# In-memory OTP state store
# Separate from users.json — OTP data is never persisted to disk.
# Keyed by normalized (lowercased) email.
# State is lost on server restart (acceptable for this project).

otp_store = {}

