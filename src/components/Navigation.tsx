
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
            SimpleWeb
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isActive('/') ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/">Home</Link>
            </Button>
            <Button
              variant={isActive('/about') ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/about">About</Link>
            </Button>
            <Button
              variant={isActive('/contact') ? 'default' : 'ghost'}
              size="sm"
              asChild
            >
              <Link to="/contact">Contact</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
