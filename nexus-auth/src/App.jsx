
import { useEffect, useState } from "react";
import AuthCard from "./components/AuthCard";
import ParticleBackground from "./components/ParticleBackground";
import { getCurrentUser, logoutUser } from "./services/api";
import toast from "react-hot-toast";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((response) => {
        console.log("CURRENT USER:", response.data);
        setUser(response.data);
      })
      .catch((error) => {
        console.log("NOT LOGGED IN:", error.response?.data);
        setUser(null);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  // Checking session
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-cyan-400">Checking authentication...</p>
      </div>
    );
  }

  // User is logged in
  if (user) {
    const handleLogout = async () => {
      try {
        await logoutUser();
        setUser(null);
        toast.success("Logged out successfully");
      } catch (error) {
        toast.error("Logout failed. Please try again.");
      }
    };

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Welcome, {user.name} 👋
          </h1>

          <p className="mt-4 text-gray-400">
            {user.email}
          </p>

          <p className="mt-2 text-sm text-cyan-400">
            Login provider: {user.provider}
          </p>

          <button
            onClick={handleLogout}
            style={{
              marginTop: "24px",
              padding: "12px 32px",
              borderRadius: "14px",
              border: "1.5px solid rgba(239, 68, 68, 0.4)",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              fontWeight: 600,
              fontSize: "14px",
              fontFamily: "Inter, sans-serif",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(239, 68, 68, 0.2)";
              e.target.style.borderColor = "rgba(239, 68, 68, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(239, 68, 68, 0.1)";
              e.target.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // User is NOT logged in → show your original Nexus Auth UI
  return (
    <div
      className="bg-black text-white relative isolate flex min-h-screen flex-col overflow-hidden"
      style={{ minHeight: "100dvh" }}
    >
      {/* Particles */}
      <ParticleBackground />

      {/* Ambient gradient blobs */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 60% at 20% 30%, rgba(6,182,212,0.12) 0%, transparent 60%)," +
            "radial-gradient(ellipse 60% 50% at 80% 70%, rgba(168,85,247,0.1) 0%, transparent 60%)," +
            "radial-gradient(ellipse 50% 40% at 50% 10%, rgba(236,72,153,0.07) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Layout */}
      <div
        className="relative flex flex-1 items-center justify-center px-3 py-8 sm:px-6 md:px-6 md:py-12"
        style={{ zIndex: 2 }}
      >
        <div className="grid w-full max-w-5xl items-center gap-8 md:gap-16 md:grid-cols-2">

          {/* Left hero panel */}
          <div className="hidden md:flex flex-col gap-6">

            {/* Logo mark */}
            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(6,182,212,0.4)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>

              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "rgba(180,220,255,0.7)",
                  textTransform: "uppercase",
                }}
              >
                Nexus Auth
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(40px, 5vw, 58px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
                background:
                  "linear-gradient(135deg, #e2f0ff 0%, #67e8f9 40%, #c084fc 80%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: 0,
              }}
            >
              Futuristic
              <br />
              Identity
              <br />
              Protocol
            </h1>

            <p
              style={{
                fontSize: 16,
                color: "rgba(180,210,240,0.45)",
                lineHeight: 1.7,
                maxWidth: 340,
              }}
            >
              Secure, seamless authentication built for the next generation of
              web applications.
            </p>

            {/* Feature bullets */}
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "8px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {[
                { icon: "🔐", text: "End-to-end encrypted sessions" },
                { icon: "⚡", text: "Lightning-fast OAuth 2.0 flow" },
                { icon: "🛡️", text: "Zero-trust architecture" },
              ].map(({ icon, text }) => (
                <li
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    color: "rgba(180,210,240,0.55)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right auth card */}
          <div className="flex w-full justify-center md:justify-end">
            <AuthCard />
          </div>

        </div>
      </div>
    </div>
  );
}