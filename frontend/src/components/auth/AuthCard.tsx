import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import OTPVerificationForm from "./OTPVerificationForm";
import ResetPasswordForm from "./ResetPasswordForm";

export default function AuthCard() {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "otp" | "reset">("login");
  const [resetEmail, setResetEmail] = useState("");

  const showTabs = mode === "login" || mode === "register";

  return (
    <div
      className="auth-card"
      style={{
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid rgba(100,220,255,0.12)",
        borderRadius: "28px",
        padding: "40px 36px",
        width: "100%",
        maxWidth: "440px",
        maxHeight: "min(760px, calc(100dvh - 48px))",
        boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        zIndex: 3,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          right: "10%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(100,220,255,0.4), transparent)",
        }}
      />

      {showTabs && (
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "28px",
            gap: "4px",
          }}
        >
          {["login", "register"].map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab as "login" | "register")}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: "9px",
                border: "none",
                cursor: "pointer",
                fontSize: "13.5px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                letterSpacing: "0.3px",
                transition: "all 0.22s",
                background: mode === tab
                  ? (tab === "login"
                    ? "linear-gradient(135deg, #06b6d4, #3b82f6)"
                    : "linear-gradient(135deg, #ec4899, #a855f7)")
                  : "transparent",
                color: mode === tab ? "#fff" : "rgba(180,210,240,0.4)",
                boxShadow: mode === tab ? "0 2px 12px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {tab === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <LoginForm
              switchPage={() => setMode("register")}
              onForgotPassword={() => setMode("forgot")}
            />
          </motion.div>
        )}

        {mode === "register" && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <RegisterForm switchPage={() => setMode("login")} />
          </motion.div>
        )}

        {mode === "forgot" && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ForgotPasswordForm
              onBack={() => setMode("login")}
              onOTPSent={(email) => {
                setResetEmail(email);
                setMode("otp");
              }}
            />
          </motion.div>
        )}

        {mode === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <OTPVerificationForm
              email={resetEmail}
              onBack={() => setMode("forgot")}
              onVerified={() => setMode("reset")}
            />
          </motion.div>
        )}

        {mode === "reset" && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ResetPasswordForm
              email={resetEmail}
              onBack={() => setMode("otp")}
              onResetSuccess={() => {
                setResetEmail("");
                setMode("login");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
