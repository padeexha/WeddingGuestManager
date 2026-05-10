import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const friendlyMessage =
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found"
          ? "Email or password is incorrect."
          : err?.message || "Unable to sign in right now.";

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(email.trim() && password && !loading);

  return (
    <div className="login-screen">
      <div className="login-layout">
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-brand">
            <span className="login-mark" aria-hidden="true" />
            <div>
              <p className="login-couple">Thulani & Isuru</p>
              <p className="login-app-name">Wedding Guest Manager</p>
            </div>
          </div>

          <div className="login-heading">
            <p className="login-eyebrow">Private access</p>
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in to continue planning.</p>
          </div>

          <form className="login-form" onSubmit={login}>
            <label className="login-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button className="login-submit" type="submit" disabled={!canSubmit}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>

        <aside className="login-visual" aria-hidden="true">
          <div className="login-arch">
            <span />
            <span />
            <span />
          </div>
          <div className="login-vow-lines">
            <span />
            <span />
            <span />
          </div>
        </aside>
      </div>
    </div>
  );
}
