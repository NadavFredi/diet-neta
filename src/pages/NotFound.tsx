import { Link } from "react-router-dom";
import { useNotFoundPage } from './NotFound';
import { StyledActionButton } from "@/components/ui/StyledActionButton";
import { Home } from "lucide-react";

const NotFound = () => {
  useNotFoundPage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" dir="rtl">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">אופס! הדף לא נמצא</p>
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-md">
            <StyledActionButton
              onClick={() => window.location.href = '/'}
              icon={Home}
              label="חזור לדף הבית"
              variant="default"
              active={false}
            />
          </div>
        </div>
        <Link to="/" className="text-blue-500 hover:text-blue-700 underline">
          חזור לדף הבית
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
