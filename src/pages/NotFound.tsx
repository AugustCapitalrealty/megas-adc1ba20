import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import logoMega from "@/assets/logos/logo-mega.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <img 
          src={logoMega} 
          alt="Mega Centro Logístico" 
          className="h-12 w-auto mx-auto opacity-60"
        />
        <div>
          <h1 className="text-7xl font-bold text-primary mb-2">404</h1>
          <p className="text-xl text-muted-foreground mb-1">Página não encontrada</p>
          <p className="text-sm text-muted-foreground">
            O endereço <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> não existe.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ir ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
