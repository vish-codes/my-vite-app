import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoutes() {
  const getToken = () => {
    return localStorage.getItem("token");
  };

  let auth = getToken();

  // 🔹 Disabled token-based restriction
  // If token is missing, go to /genpdf/create-invoice instead of /login
  return auth ? <Outlet /> : <Navigate to="/genpdf/create-invoice" />;
}
