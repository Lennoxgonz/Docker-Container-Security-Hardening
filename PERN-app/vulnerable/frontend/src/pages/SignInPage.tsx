import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../services/api";
import type { Credentials } from "../types/credentials";

function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const credentials: Credentials = { username, password };

    try {
      const response = await signIn(credentials);
      localStorage.setItem("token", response.token);
      console.log("Sign In successful:", response);
      navigate("/main");
    } catch (err: any) {
      console.error("Sign In failed:", err);
      setError(
        err.response?.data?.message || "Sign In failed. Please try again."
      );
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <div className="mb-4">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              required
              className="w-full p-2 mt-1 border rounded"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="w-full p-2 mt-1 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <small className="flex justify-center mb-3 hover:text-gray-500">
            <Link to="/signup">
              Don't have an account? Click here to sign up
            </Link>
          </small>
          <button
            type="submit"
            className="w-full p-2 text-white bg-green-600 rounded hover:bg-green-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignInPage;
