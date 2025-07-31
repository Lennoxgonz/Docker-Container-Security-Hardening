import { useState } from "react";
import { searchUsers } from "../services/api";
import type { User } from "../types/user.types";

const Search = (): React.ReactNode => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setResults([]);
      setError("");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const data: User[] = await searchUsers(searchTerm);
      setResults(data);
      if (data.length === 0) {
        setError("No users found.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 border-t-2 pt-6 text-left">
      <h2 className="text-xl font-semibold mb-3">User Search</h2>

      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter username"
          className="flex-grow p-2 border rounded-md"
        />
        <button
          onClick={handleSearch}
          disabled={!searchTerm.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Results Found:</h3>
          <ul className="list-disc list-inside bg-gray-50 p-3 mt-2 rounded-md border max-h-40 overflow-y-auto">
            {results.map((user) => (
              <li key={user.id}>
                <strong>Username:</strong> {user.username}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Search;
