import { useState, useEffect, useRef } from "react";
import { verifyOTP, forgotPassword } from "../../services/api";
import toast from "react-hot-toast";

export default function OTPVerificationForm({ email, onBack, onVerified }: { email: string, onBack: () => void, onVerified: () => void }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("OTP must be exactly 6 digits");
      return;
    }

    try {
      setLoading(true);
      await verifyOTP({ Email: email, OTP: otp.trim() });
      toast.success("OTP verified successfully");
      onVerified();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        toast.error(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        toast.error(detail.map((d: any) => d.msg).join(", "));
      } else {
        toast.error("OTP verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await forgotPassword({ Email: email });
      toast.success("New OTP sent to your email");

      setResendCooldown(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setOtp("");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Failed to resend OTP");
      }
    } finally {
      setResending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="auth-title bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
          Verify OTP
        </h2>
        <p className="auth-subtitle">
          We sent a 6-digit OTP to <span style={{ color: "#22d3ee" }}>{email}</span>
        </p>
      </div>

      <div className="input-wrapper">
        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
          <path d="M12 12h.01"/>
          <path d="M8 12h.01"/>
          <path d="M16 12h.01"/>
        </svg>
        <input
          className="input plain-input"
          type="text"
          inputMode="numeric"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={handleOTPChange}
          onKeyDown={handleKeyDown}
          maxLength={6}
          autoComplete="one-time-code"
          style={{ letterSpacing: "4px", fontSize: "18px", fontWeight: 600, paddingLeft: '46px' }}
        />
      </div>

      <button
        onClick={handleVerify}
        className="neon-btn"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Verifying…
          </span>
        ) : "Verify OTP"}
      </button>

      <div className="mt-4 text-center">
        {resendCooldown > 0 ? (
          <p className="text-xs" style={{ color: "rgba(180,210,240,0.45)" }}>
            Resend OTP in <span style={{ color: "#22d3ee" }}>{resendCooldown}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-xs font-medium bg-transparent border-none cursor-pointer transition-colors duration-200"
            style={{ color: "rgba(34,211,238,0.7)" }}
            onMouseEnter={(e: any) => (e.target.style.color = "#22d3ee")}
            onMouseLeave={(e: any) => (e.target.style.color = "rgba(34,211,238,0.7)")}
          >
            {resending ? "Sending…" : "Resend OTP"}
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-sm" style={{ color: "rgba(180,210,240,0.45)" }}>
        <button onClick={onBack} className="switch-link">
          ← Back
        </button>
      </p>
    </>
  );
}
