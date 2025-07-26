import { useState } from "react";
import { searchUsers } from "../services/api";

type UserResult = {
  id: number;
  username: string;
};

function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setError("");
    try {
      const data: UserResult[] = await searchUsers(searchTerm);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setResults([]);
    }
  };

  return (
    <div className="mt-8 border-t-2 pt-6 text-left">
      <h2 className="text-xl font-semibold mb-3">User Search</h2>
      <p className="text-sm text-gray-600 mb-4"></p>

      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter search term"
          className="flex-grow p-2 border rounded-md"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Search
        </button>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Results Found:</h3>
          <ul className="list-disc list-inside bg-gray-50 p-3 mt-2 rounded-md border">
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
}

export default Search;
