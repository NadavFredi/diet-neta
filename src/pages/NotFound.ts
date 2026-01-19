import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export const useNotFoundPage = () => {
  const location = useLocation();

  useEffect(() => {
  }, [location.pathname]);

  return {};
};





























