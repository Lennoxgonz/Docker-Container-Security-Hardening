import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMainPageData } from "../services/api";
import type { User } from "../types/user";

const Header = (): React.ReactNode => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSessionUser = async () => {
      try {
        const data = await getMainPageData();
        if (isMounted) {
          setCurrentUser(data.user);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    loadSessionUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/signin");
  };

  return (
    <header className="bg-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-bold">
          <Link to="/">Hardened App</Link>
        </div>
        <nav className="space-x-6">
          {!isCheckingAuth && currentUser ? (
            <>
              <Link to="/main" className="text-gray-600 hover:text-gray-900">
                Main Page
              </Link>
              <Link
                to={`/profile/${currentUser.id}`}
                className="text-gray-600 hover:text-gray-900"
              >
                My Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link to="/signup" className="text-gray-600 hover:text-gray-900">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
