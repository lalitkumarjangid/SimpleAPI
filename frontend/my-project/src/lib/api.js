import axios from "axios";
import { clearAuth, getStoredAuth } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getStoredAuth()) {
      clearAuth();
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export async function signUp(data) {
  const response = await api.post("/auth/signup", data);
  return response.data;
}

export async function signIn(data) {
  const response = await api.post("/auth/signin", data);
  return response.data;
}

export async function signInWithGoogle(accessToken) {
  const response = await api.post("/auth/google", { accessToken });
  return response.data;
}

export async function getUsers({ page = 1, limit = 10 } = {}) {
  const response = await api.get("/get", { params: { page, limit } });
  return response.data;
}

export async function createUser(data) {
  const response = await api.post("/create", data);
  return response.data;
}

export default api;
