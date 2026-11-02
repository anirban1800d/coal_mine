import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthCard from "../components/auth/AuthCard";
import { Radar, ShieldCheck, HardHat, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10 min-h-[100dvh] py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 max-w-xl text-center md:text-left"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl mb-8">
            <Radar className="h-8 w-8" style={{ color: 'var(--color-cpcb)' }} />
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            GeoMine <span style={{ color: 'var(--color-cpcb)' }}>AI</span>
          </h1>
          
          <p className="text-xl text-[var(--color-muted-strong)] mb-10 leading-relaxed font-light">
            Mining &amp; Environmental Compliance Intelligence
          </p>

          <ul className="space-y-4 text-left max-w-sm mx-auto md:mx-0">
            {[
              { icon: Sparkles, text: "AI-Powered RAG Search" },
              { icon: ShieldCheck, text: "CPCB & DGMS Compliance" },
              { icon: HardHat, text: "Secure Session Authentication" }
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3 text-[var(--color-foreground)] bg-[var(--color-surface)]/50 border border-[var(--color-border)] px-4 py-3 rounded-xl backdrop-blur-sm">
                <feature.icon className="h-5 w-5" style={{ color: 'var(--color-cpcb)' }} />
                <span className="font-medium text-sm">{feature.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-[440px] flex-shrink-0"
        >
          <AuthCard />
        </motion.div>
      </div>
    </div>
  );
}
