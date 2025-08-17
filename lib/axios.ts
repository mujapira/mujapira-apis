import axios from "axios";


const BASE_URL = "https://api.mujapira.com/";
//const BASE_URL = "http://localhost:5000/";

export const apiGateway = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Cliente SEM interceptors para rotas de autenticação
export const authHttp = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
