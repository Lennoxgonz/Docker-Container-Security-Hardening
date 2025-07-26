import axios from "axios";
import type { Credentials } from "../types/credentials";

const API_BASE_URL =
  "https://3000-lennoxgonz-dockercontai-fsrei4975c5.ws-us120.gitpod.io";
//const API_BASE_URL = "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const signUp = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signup", credentials);
  return data;
};

export const signIn = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signin", credentials);
  return data;
};

export const getMainPageData = async () => {
  const { data } = await apiClient.get("/main");
  return data;
};

export const searchUsers = async (searchTerm: string) => {
  const { data } = await apiClient.get("/search", {
    params: {
      term: searchTerm,
    },
  });
  return data;
};
