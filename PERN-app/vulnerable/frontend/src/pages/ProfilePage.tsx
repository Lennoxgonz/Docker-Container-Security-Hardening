import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getProfile } from "../services/api";

interface UserProfile {
  id: number;
  username: string;
}

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        setError("User ID is missing.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getProfile(userId);
        setProfile(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return (
    <div className="mx-10 mt-8 p-4">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">User Profile</h1>

        {loading && <p>Loading profile...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {profile && (
          <div>
            <p className="text-lg">
              <strong>Username:</strong> {profile.username}
            </p>
            <p className="text-lg">
              <strong>User ID:</strong> {profile.id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
