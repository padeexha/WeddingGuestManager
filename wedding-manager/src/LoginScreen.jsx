import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#FDF4F7"
      }}
    >
      <div
        style={{
          width: 340,
          background: "white",
          padding: 30,
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
        }}
      >
        <h2 style={{ marginBottom: 20 }}>
          Wedding Manager Login
        </h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          style={{
            width:"100%",
            marginBottom:12,
            padding:12,
            borderRadius:10,
            border:"1px solid #ddd"
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          style={{
            width:"100%",
            marginBottom:20,
            padding:12,
            borderRadius:10,
            border:"1px solid #ddd"
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          style={{
            width:"100%",
            padding:12,
            background:"#B05278",
            color:"white",
            border:"none",
            borderRadius:10,
            cursor:"pointer"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}
