import axios from "axios";

export const apiGateway = axios.create({
  baseURL: 'https://mujapira.com',
  withCredentials: true,
});
