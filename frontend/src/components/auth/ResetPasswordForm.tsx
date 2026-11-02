import { useState } from "react";
import { resetPassword } from "../../services/api";
import toast from "react-hot-toast";

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

export default function ResetPasswordForm({ email, onBack, onResetSuccess }: { email: string, onBack: () => void, onResetSuccess: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (
      newPassword.length < 10 ||
      (newPassword.match(/[A-Z]/g) || []).length < 2 ||
      (newPassword.match(/\d/g) || []).length < 5 ||
      (newPassword.match(/[!@#$%^&*]/g) || []).length < 3
    ) {
      toast.error("Password needs 10+ chars, 2 uppercase letters, 5 numbers, and 3 special characters");
      return;
    }

    try {
      setLoading(true);
      const res = await resetPassword({ Email: email, NewPassword: newPassword });
      toast.success(res.message || "Password reset successful");
      onResetSuccess();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        toast.error(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        toast.error(detail.map((d: any) => d.msg).join(", "));
      } else {
        toast.error("Password reset failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleReset();
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="auth-title bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
          Reset Password
        </h2>
        <p className="auth-subtitle">Enter your new password</p>
      </div>

      <div className="input-wrapper">
        <LockIcon />
        <input
          type={showNewPassword ? "text" : "password"}
          className="input password-input"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="new-password"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowNewPassword((c) => !c)}
          aria-label={showNewPassword ? "Hide password" : "Show password"}
          title={showNewPassword ? "Hide password" : "Show password"}
        >
          {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <div className="input-wrapper">
        <LockIcon />
        <input
          type={showConfirmPassword ? "text" : "password"}
          className="input password-input"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="new-password"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowConfirmPassword((c) => !c)}
          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          title={showConfirmPassword ? "Hide password" : "Show password"}
        >
          {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <p className="password-hint">
        Enter minimum length 10 at least (2 uppercase 5 numbers and 3 special chars like:-!@#$)
      </p>

      <button
        onClick={handleReset}
        className="neon-btn"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Resetting…
          </span>
        ) : "Reset Password"}
      </button>

      <p className="mt-6 text-center text-sm" style={{ color: "rgba(180,210,240,0.45)" }}>
        <button onClick={onBack} className="switch-link">
          ← Back
        </button>
      </p>
    </>
  );
}
