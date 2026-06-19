import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export function AdminLoginPage() {
  const login = useAdminAuthStore((s) => s.login);
  const isFirebase = useAdminAuthStore((s) => s.isFirebase);
  const authLoading = useAdminAuthStore((s) => s.authLoading);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const ok = await login(identifier, password);
    setSubmitting(false);
    if (!ok) {
      setError(isFirebase ? "Invalid email or password" : "Invalid username or password");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl glass-strong p-6 sm:p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="mb-4" />
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full gradient-brand shadow-lg shadow-brand-600/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-xl font-bold text-white">Admin Access</h1>
          <p className="mt-1 text-sm text-white/50">Sign in to manage Shahriar TV</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              {isFirebase ? "Email" : "Username"}
            </label>
            <Input
              type={isFirebase ? "email" : "text"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isFirebase ? "you@example.com" : "Enter username"}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Sign In
          </Button>

          {isFirebase && (
            <p className="text-center text-xs text-white/30">Secured by Firebase Authentication</p>
          )}

          {!isFirebase && (
            <div className="rounded-lg border border-white/10 bg-surface-300/50 px-3 py-2 text-center text-xs text-white/40">
              Using local login. Default: <span className="font-mono text-white/60">shahriar</span> /{" "}
              <span className="font-mono text-white/60">shahriar123</span>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
