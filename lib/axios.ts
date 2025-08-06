import axios from "axios";

export const apiGateway = axios.create({
  baseURL: "https://api.mujapira.com/",
  // baseURL: "http://localhost:5000/",
  withCredentials: true,
});
