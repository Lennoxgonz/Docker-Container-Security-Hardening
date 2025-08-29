import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../services/api";
import type { Credentials } from "../types/user";

const SignInPage = (): React.ReactNode => {
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
      localStorage.setItem("user", JSON.stringify(response.user));

      navigate("/main");
    } catch (err: any) {
      console.error("Sign In failed:", err);
      setError(
        err.response?.data?.message || "Sign In failed. Please try again."
      );
    }
  };

  return (
    <div className="flex justify-center py-16 bg-gray-50">
      <div className="p-8 bg-white rounded-md shadow-sm w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center mb-6">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-center">{error}</p>}
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
            className="w-full p-2 text-white bg-green-500 rounded-md hover:bg-green-600"
          >
            Sign In
          </button>
          <p className="text-sm text-center text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-green-600 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
