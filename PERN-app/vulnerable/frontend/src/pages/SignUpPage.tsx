import { useState } from "react";
import { signUp } from "../services/api";
import type { Credentials } from "../types/credentials";
import { Link, useNavigate } from "react-router-dom";

function SignUpPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const credentials: Credentials = { username, password };

    try {
      const response = await signUp(credentials);
      console.log("Sign up successful:", response);
      setSuccess(response.message + " Redirecting to sign in...");

      setTimeout(() => {
        navigate("/signin");
      }, 2000);
    } catch (err: any) {
      console.error("Sign Up failed:", err);
      setError(
        err.response?.data?.message || "Sign Up failed. Please try again."
      );
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          {success && (
            <p className="text-green-500 text-center mb-4">{success}</p>
          )}
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
            <Link to="/signin">
              Already have an account? Click here to sign in
            </Link>
          </small>
          <button
            type="submit"
            className="w-full p-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignUpPage;
