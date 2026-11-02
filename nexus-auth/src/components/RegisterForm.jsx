import { useState } from "react";
import { registerUser } from "../services/api";
import toast from "react-hot-toast";

// Icons
const UserIcon = () => (
  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const MailIcon = () => (
  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const PhoneIcon = () => (
  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.05 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
  </svg>
);

const LockIcon = () => (
  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = () => (
  <svg className="password-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg className="password-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61C3.8 8.5 2 12 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <path d="M2 2l20 20"/>
  </svg>
);

export default function RegisterForm({ switchPage }) {
  const [form, setForm] = useState({
    name: "",
    surname: "",
    Email: "",
    PhoneNumber: "",
    Password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const normalizePhone = (phone) => {
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");

    if (trimmed.startsWith("+")) return trimmed;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;

    return trimmed;
  };

  const getErrorMessage = (error) => {
    const data = error?.response?.data;

    if (data?.message) return data.message;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail.map((item) => item.msg).join(", ");
    }

    if (error?.request) {
      return "Cannot reach the server. Make sure FastAPI is running on port 8000.";
    }

    return "Registration failed. Please check your details.";
  };

  const submit = async () => {
    const payload = {
      ...form,
      name: form.name.trim(),
      surname: form.surname.trim(),
      Email: form.Email.trim(),
      PhoneNumber: normalizePhone(form.PhoneNumber),
    };

    if (!payload.name || !payload.surname || !payload.Email || !payload.PhoneNumber || !payload.Password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.Email)) {
      toast.error("Enter a valid email address");
      return;
    }

    if (!/^\+91[6-9]\d{9}$/.test(payload.PhoneNumber)) {
      toast.error("Enter a valid Indian phone number");
      return;
    }

    if (
      payload.Password.length < 10 ||
      (payload.Password.match(/[A-Z]/g) || []).length < 2 ||
      (payload.Password.match(/\d/g) || []).length < 5 ||
      (payload.Password.match(/[!@#$%^&*]/g) || []).length < 3
    ) {
      toast.error("Password needs 10+ chars, 2 uppercase letters, 5 numbers, and 3 special characters");
      return;
    }

    try {
      setLoading(true);
      await registerUser(payload);
      toast.success("Account created!");
      setTimeout(() => switchPage(), 1500);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="auth-title bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Create account
        </h2>
        <p className="auth-subtitle">Join Nexus — it's free</p>
      </div>

      {/* Name row */}
      <div className="flex gap-3">
        <div className="input-wrapper flex-1">
          <UserIcon />
          <input
            id="reg-name"
            className="input"
            placeholder="First name"
            onChange={update("name")}
            autoComplete="given-name"
          />
        </div>
        <div className="input-wrapper flex-1">
          <UserIcon />
          <input
            id="reg-surname"
            className="input"
            placeholder="Surname"
            onChange={update("surname")}
            autoComplete="family-name"
          />
        </div>
      </div>

      {/* Email */}
      <div className="input-wrapper">
        <MailIcon />
        <input
          id="reg-email"
          className="input"
          type="email"
          placeholder="Email address"
          onChange={update("Email")}
          autoComplete="email"
        />
      </div>

      {/* Phone */}
      <div className="input-wrapper">
        <PhoneIcon />
        <input
          id="reg-phone"
          className="input"
          placeholder="Phone number"
          onChange={update("PhoneNumber")}
          autoComplete="tel"
        />
      </div>

      {/* Password */}
      <div className="input-wrapper">
        <LockIcon />
        <input
          id="reg-password"
          type={showPassword ? "text" : "password"}
          className="input password-input"
          placeholder="Create password"
          onChange={update("Password")}
          autoComplete="new-password"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      <p className="password-hint">
        Enter minimum length 10 at least (2 uppercase 5 numbers and 3 special chars like:-!@#$)
      </p>

      {/* Submit */}
      <button
        id="reg-submit"
        onClick={submit}
        className="neon-btn"
        style={{ background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)", boxShadow: "0 4px 24px rgba(168,85,247,0.35)" }}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Creating account…
          </span>
        ) : "Create Account"}
      </button>

      {/* Terms note */}
      <p className="mt-3 text-center text-xs" style={{ color: "rgba(180,210,240,0.3)" }}>
        By registering you agree to our{" "}
        <span className="text-pink-400/70 cursor-pointer hover:text-pink-300 transition-colors">Terms</span>
        {" & "}
        <span className="text-pink-400/70 cursor-pointer hover:text-pink-300 transition-colors">Privacy Policy</span>
      </p>

      {/* Switch to login */}
      <p className="mt-5 text-center text-sm" style={{ color: "rgba(180,210,240,0.45)" }}>
        Already have an account?{" "}
        <button onClick={switchPage} className="switch-link" style={{ color: "#f472b6" }}>
          Sign in
        </button>
      </p>
    </>
  );
}
