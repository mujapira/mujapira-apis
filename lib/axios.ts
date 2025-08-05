import axios from "axios";

export const apiGateway = axios.create({
  baseURL: "https://api.mujapira.com/",
  withCredentials: true,
});
