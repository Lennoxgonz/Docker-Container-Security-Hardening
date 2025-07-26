import { Link, useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  return (
    <header className="bg-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-bold">
          <Link to="/">Vulnerable App</Link>
        </div>
        <nav className="space-x-6">
          {token ? (
            <>
              <Link to="/main" className="text-gray-600 hover:text-gray-900">
                Main Page
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
}

export default Header;
