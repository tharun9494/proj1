import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5001/api/auth';

export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_BASE_URL}/login`, { email, password });
  return response.data;
};

export const register = async (userData: { email: string; password: string; name: string }) => {
  const response = await axios.post(`${API_BASE_URL}/register`, userData);
  return response.data;
}; 