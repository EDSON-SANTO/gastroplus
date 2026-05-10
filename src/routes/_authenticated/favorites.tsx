import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Os meus favoritos — Sabores" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("restaurant_id, restaurants(id, name, slug, address, cover_image)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Os meus favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Restaurantes guardados para mais tarde.</p>

      {isLoading ? (
        <div className="mt-6 h-32 animate-pulse rounded-xl bg-muted" />
      ) : !data || data.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Ainda sem favoritos</p>
          <p className="mt-1 text-sm text-muted-foreground">Explore restaurantes e toque no coração para guardar.</p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((f: any) => f.restaurants && (
            <li key={f.restaurant_id}>
              <Link
                to="/restaurant/$slug"
                params={{ slug: f.restaurants.slug }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-all hover:shadow-warm"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {f.restaurants.cover_image && <img src={f.restaurants.cover_image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{f.restaurants.name}</p>
                  {f.restaurants.address && (
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{f.restaurants.address}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
