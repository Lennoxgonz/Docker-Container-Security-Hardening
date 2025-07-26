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
    <div className="flex justify-center py-16 bg-gray-50">
      <div className="p-8 bg-white rounded-md shadow-sm w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center mb-6">
          Create an Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-center">{error}</p>}
          {success && <p className="text-green-600 text-center">{success}</p>}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              className="w-full p-2 mt-1 border border-gray-300 rounded-md"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full p-2 mt-1 border border-gray-300 rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full p-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
          >
            Sign Up
          </button>
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignUpPage;
