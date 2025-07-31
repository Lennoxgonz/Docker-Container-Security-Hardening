import { useState } from "react";
import { signUp } from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

const signUpSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormFields = z.infer<typeof signUpSchema>;

const SignUpPage = (): React.ReactNode => {
  const [formData, setFormData] = useState<SignUpFormFields>({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
    api?: string;
  }>({});
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setSuccess("");

    const validationResult = signUpSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors = Object.fromEntries(
        validationResult.error.issues.map((issue) => [
          issue.path[0],
          issue.message,
        ])
      );
      setErrors(fieldErrors);
      return;
    }

    try {
      const { username, password } = validationResult.data;
      const response = await signUp({ username, password });

      setSuccess(response.message + " Redirecting to sign in...");
      setTimeout(() => navigate("/signin"), 2000);
    } catch (err: any) {
      console.error("Sign Up failed:", err);
      setErrors({
        api: err.response?.data?.message || "Sign Up failed. Please try again.",
      });
    }
  };

  return (
    <div className="flex justify-center py-16 bg-gray-50">
      <div className="p-8 bg-white rounded-md shadow-sm w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center mb-6">
          Create an Account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.api && (
            <p className="text-red-600 text-center">{errors.api}</p>
          )}
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
              value={formData.username}
              onChange={handleChange}
            />
            {errors.username && (
              <p className="text-red-600 text-xs mt-1">{errors.username}</p>
            )}
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
              value={formData.password}
              onChange={handleChange}
            />
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">{errors.password}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="w-full p-2 mt-1 border border-gray-300 rounded-md"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">
                {errors.confirmPassword}
              </p>
            )}
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
};

export default SignUpPage;
