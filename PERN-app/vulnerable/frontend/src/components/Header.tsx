function Header() {
  return (
    <header className="bg-gray-100 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-bold">
          <a href="/">App</a>
        </div>

        <nav className="space-x-6">
          <a href="/signin" className="text-gray-600 hover:text-gray-900">
            Sign In
          </a>
          <a href="/signup" className="text-gray-600 hover:text-gray-900">
            Sign Up
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
