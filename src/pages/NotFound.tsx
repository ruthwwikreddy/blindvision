import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { FounderCredit } from "@/components/FounderCredit";
import { FOUNDER_URL } from "@/lib/founder";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
          <Link to="/" className="text-foreground underline underline-offset-2 hover:text-primary">
            Return to Home
          </Link>
          <p className="text-sm text-muted-foreground mt-6">
            Blind Vision —{' '}
            <a href={FOUNDER_URL} target="_blank" rel="author noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              ruthwikreddy.live
            </a>
          </p>
        </div>
      </div>
      <FounderCredit className="py-4" />
    </div>
  );
};

export default NotFound;
