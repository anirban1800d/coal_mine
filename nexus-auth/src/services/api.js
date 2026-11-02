import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export const loginUser = (data) => api.post("/login", data);
export const registerUser = (data) => api.post("/register", data);
export const getCurrentUser = () => api.get("/me");
export const logoutUser = () => api.post("/logout");
export const forgotPassword = (data) => api.post("/forgot-password", data);
export const verifyOTP = (data) => api.post("/verify-otp", data);
export const resetPassword = (data) => api.post("/reset-password", data);

export default api;
