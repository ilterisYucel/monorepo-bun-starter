import axios from "axios";

export const API_BASE_URL = "http://16.171.8.238:8016";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});
