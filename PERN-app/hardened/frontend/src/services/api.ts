import axios from "axios";
import type { Credentials } from "../types/user";

const API_BASE_URL = "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  /**
   * Vulnerability #7 - Missing Auth/API Hardening Controls
   * Part 1/3 - Requests now include httpOnly auth cookies instead of bearer tokens from localStorage.
   */
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/signin";
    }

    return Promise.reject(error);
  }
);

export const signUp = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signup", credentials);
  return data;
};

export const signIn = async (credentials: Credentials) => {
  // Vulnerability #7 - Missing Auth/API Hardening Controls
  // Token is stored in httpOnly auth cookies upon signin
  const { data } = await apiClient.post("/signin", credentials);
  return data;
};

export const signOut = async () => {
  const { data } = await apiClient.post("/signout");
  return data;
};

export const getMainPageData = async () => {
  const { data } = await apiClient.get("/main");
  return data;
};

export const searchUsers = async (searchTerm: string) => {
  const { data } = await apiClient.get("/search", {
    params: { term: searchTerm },
  });
  return data;
};

export const getProfile = async (userId: string | number) => {
  const { data } = await apiClient.get(`/profile/${userId}`);
  return data;
};
