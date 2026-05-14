import { Link } from "@tanstack/react-router";
import { UtensilsCrossed, Heart, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero text-primary-foreground shadow-warm">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <span>Gastro+</span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/favorites"><Heart className="mr-1.5 h-4 w-4" />Favoritos</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-1.5 h-4 w-4" />Sair
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login"><LogIn className="mr-1.5 h-4 w-4" />Entrar</Link>
              </Button>
              <Button asChild size="sm" className="bg-hero text-primary-foreground shadow-warm hover:opacity-90">
                <Link to="/register"><UserIcon className="mr-1.5 h-4 w-4" />Registar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
