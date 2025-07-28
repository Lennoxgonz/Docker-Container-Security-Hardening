import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMainPageData } from "../services/api";
import Search from "../components/Search";

type ApiData = {
  message: string;
  user: {
    id: number;
    username: string;
  };
};

function MainPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getMainPageData();
        setData(response);
      } catch (err) {
        console.error("Failed to fetch main page data:", err);
        setError("Your session is invalid. Please sign in again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/signin"), 2000);
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <div className="flex justify-center h-screen py-16 bg-gray-50 mt-1">
      <div className="p-8 bg-white rounded-md shadow-sm text-center max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Main Page</h1>

        {error ? (
          <p className="text-red-600">{error}</p>
        ) : data ? (
          <>
            <p className="text-gray-700 mb-4">
              <strong>Welcome, {data.user.username}!</strong>
              <br />
            </p>

            <Search />
          </>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>
    </div>
  );
}

export default MainPage;
