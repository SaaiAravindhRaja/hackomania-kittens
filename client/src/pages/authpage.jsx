import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001/auth";

async function apiFetch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}


function Input({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          padding: "11px 14px",
          color: "#f1f5f9",
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.2s",
          fontFamily: "inherit",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#38bdf8")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
      />
    </div>
  );
}

function Btn({ children, onClick, loading, variant = "primary" }) {
  const base = {
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.04em",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    width: "100%",
  };
  const styles =
    variant === "primary"
      ? { ...base, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff" }
      : { ...base, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8" };

  return (
    <button onClick={onClick} disabled={loading} style={styles}>
      {loading ? "Please wait…" : children}
    </button>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onSwitch }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    if (!username || !email || !password) return setError("All fields are required.");
    setLoading(true);
    try {
      const { user } = await apiFetch("/register", { username, email, password });
      onSuccess(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Input label="Username" value={username} onChange={setUsername} placeholder="your_handle" />
      <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
      <Btn onClick={handleSubmit} loading={loading}>Create account</Btn>
      <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", margin: 0 }}>
        Already have an account?{" "}
        <span onClick={onSwitch} style={{ color: "#38bdf8", cursor: "pointer" }}>Sign in</span>
      </p>
    </div>
  );
}

//Login form

function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    if (!email || !password) return setError("Email and password are required.");
    setLoading(true);
    try {
      const { user } = await apiFetch("/login", { email, password });
      onSuccess(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
      <Btn onClick={handleSubmit} loading={loading}>Sign in</Btn>
      <p style={{ textAlign: "center", fontSize: 13, color: "#64748b", margin: 0 }}>
        No account?{" "}
        <span onClick={onSwitch} style={{ color: "#38bdf8", cursor: "pointer" }}>Register</span>
      </p>
    </div>
  );
}

//Success

function SuccessScreen({ user, onLogout }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28,
      }}>
        {user.username?.[0]?.toUpperCase() ?? "U"}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Welcome, {user.username}!</p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{user.email}</p>
      </div>
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, padding: "10px 16px", width: "100%", textAlign: "left",
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>User ID</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8", wordBreak: "break-all", fontFamily: "monospace" }}>{user.user_id}</p>
      </div>
      <Btn variant="secondary" onClick={onLogout}>Sign out</Btn>
    </div>
  );
}

//Root

export default function AuthPage() {
  const [mode, setMode] = useState("register"); // Register or login
  const [authedUser, setAuthedUser] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1120",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: 24,
    }}>
      {/* subtle grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage:
          "linear-gradient(rgba(56,189,248,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.03) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 400,
        background: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "36px 32px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        {/* logo / wordmark */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
          }}>⬡</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
            ClickAuth
          </span>
        </div>

        {authedUser ? (
          <SuccessScreen user={authedUser} onLogout={() => { setAuthedUser(null); setMode("login"); }} />
        ) : (
          <>
            {/* tab switcher */}
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 8,
              padding: 3,
              marginBottom: 24,
              gap: 2,
            }}>
              {["register", "login"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    transition: "all 0.2s",
                    background: mode === m ? "rgba(255,255,255,0.09)" : "transparent",
                    color: mode === m ? "#f1f5f9" : "#475569",
                  }}
                >
                  {m === "register" ? "Register" : "Sign in"}
                </button>
              ))}
            </div>

            {mode === "register"
              ? <RegisterForm onSuccess={setAuthedUser} onSwitch={() => setMode("login")} />
              : <LoginForm onSuccess={setAuthedUser} onSwitch={() => setMode("register")} />
            }
          </>
        )}
      </div>
    </div>
  );
}