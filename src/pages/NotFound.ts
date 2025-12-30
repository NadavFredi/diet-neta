import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export const useNotFoundPage = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return {};
};





























