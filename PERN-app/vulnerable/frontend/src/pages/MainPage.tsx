import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMainPageData } from "../services/api";

type ApiData = {
  message: string;
};

function MainPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getMainPageData()
      .then((response) => {
        setData(response);
      })
      .catch((err) => {
        console.error("Failed to fetch main page data:", err);
        setError("Your session may be invalid. Please sign in again.");
        localStorage.removeItem("token"); // Clear bad token
        setTimeout(() => navigate("/signin"), 2000);
      });
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100">
      <div className="p-10 bg-white rounded-lg shadow-xl text-center w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4">🛡️ Protected Area 🛡️</h1>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : data ? (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 text-left">
            <p className="font-medium">{data.message}</p>
          </div>
        ) : (
          <p>Loading protected data...</p>
        )}
      </div>
    </div>
  );
}

export default MainPage;
