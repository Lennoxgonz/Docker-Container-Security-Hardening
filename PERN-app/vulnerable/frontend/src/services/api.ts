import axios from "axios";
import type { Credentials } from "../types/credentials";

//const API_BASE_URL = "http://localhost:3000";
const API_BASE_URL = "https://3000-lennoxgonz-dockercontai-fsrei4975c5.ws-us120.gitpod.io";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const signUp = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signup", credentials);
  return data;
};

export const signIn = async (credentials: Credentials) => {
  const { data } = await apiClient.post("/signin", credentials);
  return data;
};
