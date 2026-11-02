import { useState } from "react";
import { forgotPassword } from "../../services/api";
import toast from "react-hot-toast";

const MailIcon = () => (
  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

export default function ForgotPasswordForm({ onBack, onOTPSent }: { onBack: () => void, onOTPSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPassword({ Email: email.trim() });
      toast.success(res.message || "OTP sent to your email");
      onOTPSent(email.trim());
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        toast.error(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        toast.error(detail.map((d: any) => d.msg).join(", "));
      } else {
        toast.error("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSendOTP();
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="auth-title bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
          Forgot Password
        </h2>
        <p className="auth-subtitle">Enter your registered email address</p>
      </div>

      <div className="input-wrapper">
        <MailIcon />
        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
        />
      </div>

      <button
        onClick={handleSendOTP}
        className="neon-btn"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Sending…
          </span>
        ) : "Send OTP"}
      </button>

      <p className="mt-6 text-center text-sm" style={{ color: "rgba(180,210,240,0.45)" }}>
        <button onClick={onBack} className="switch-link">
          ← Back to Login
        </button>
      </p>
    </>
  );
}
