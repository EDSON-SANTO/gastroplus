import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ArrowLeft, MapPin, Phone, MessageCircle, Info, Eye, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/$slug")({
  component: RestaurantPage,
});

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  ingredients: string | null;
  is_available: boolean;
  category_id: string | null;
}

function RestaurantPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [infoItem, setInfoItem] = useState<MenuItem | null>(null);
  const [viewItem, setViewItem] = useState<MenuItem | null>(null);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurant!.id)
        .order("position");
      return data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["items", restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurant!.id)
        .eq("is_available", true);
      return (data ?? []) as MenuItem[];
    },
  });

  const grouped = useMemo(() => {
    const cats = categories ?? [];
    const its = items ?? [];
    const map = new Map<string | null, MenuItem[]>();
    for (const it of its) {
      const k = it.category_id ?? null;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    const out: { id: string | null; name: string; items: MenuItem[] }[] = [];
    for (const c of cats) {
      const list = map.get(c.id);
      if (list?.length) out.push({ id: c.id, name: c.name, items: list });
    }
    const uncategorized = map.get(null);
    if (uncategorized?.length) out.push({ id: null, name: "Outros", items: uncategorized });
    return out;
  }, [categories, items]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.info("Inicie sessão para guardar favoritos.");
      return;
    }
    if (!restaurant) return;
    const { error } = await supabase.from("favorites").insert({ user_id: user.id, restaurant_id: restaurant.id });
    if (error) toast.error("Erro ao guardar."); else toast.success("Adicionado aos favoritos!");
  };

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-6"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  }

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-2xl font-bold">Restaurante não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pode estar pendente de aprovação ou ter sido removido.</p>
        <Button asChild className="mt-6"><Link to="/">Voltar ao início</Link></Button>
      </div>
    );
  }

  const waNumber = (restaurant.whatsapp || restaurant.phone || "").replace(/\D/g, "");
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Olá, gostaria de fazer um pedido do restaurante ${restaurant.name}`)}` : null;
  const fmtPrice = (v: number) => `${Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 0 })} Kz`;

  return (
    <>
      {/* Cover */}
      <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64">
        {restaurant.cover_image ? (
          <img src={restaurant.cover_image} alt={restaurant.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <Button asChild variant="secondary" size="sm" className="absolute left-3 top-3 shadow-card">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Link>
        </Button>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-32">
        <div className="-mt-10 rounded-2xl border border-border bg-card p-5 shadow-warm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{restaurant.name}</h1>
              {restaurant.address && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />{restaurant.address}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={toggleFavorite} aria-label="Adicionar aos favoritos">
              <Heart className="h-5 w-5" />
            </Button>
          </div>
          {restaurant.description && (
            <p className="mt-3 text-sm text-muted-foreground">{restaurant.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {restaurant.phone && (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${restaurant.phone}`}><Phone className="mr-1.5 h-4 w-4" />Ligar</a>
              </Button>
            )}
          </div>
        </div>

        {/* Menu */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Menu</h2>
          {grouped.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Menu ainda não disponível.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {grouped.map((cat) => (
                <div key={cat.id ?? "x"}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat.name}</h3>
                  <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                    {cat.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-3 p-3 sm:p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{it.name}</p>
                          <p className="text-sm font-semibold text-primary">{fmtPrice(it.price)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setInfoItem(it)} aria-label="Ver descrição">
                            <Info className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Info</span>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setViewItem(it)} aria-label="Ver imagem" disabled={!it.image}>
                            <Eye className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Ver</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating WhatsApp CTA */}
      {waUrl && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
          <Button asChild className="w-full bg-whatsapp text-whatsapp-foreground shadow-warm hover:opacity-90">
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />Contactar via WhatsApp
            </a>
          </Button>
        </div>
      )}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-warm transition-transform hover:scale-110 sm:flex"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}

      {/* Info modal */}
      <Dialog open={!!infoItem} onOpenChange={(o) => !o && setInfoItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{infoItem?.name}</DialogTitle>
            <DialogDescription className="text-base font-semibold text-primary">
              {infoItem && fmtPrice(infoItem.price)}
            </DialogDescription>
          </DialogHeader>
          {infoItem?.description && <p className="text-sm text-muted-foreground">{infoItem.description}</p>}
          {infoItem?.ingredients && (
            <div className="mt-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Ingredientes</p>
              <p className="text-sm">{infoItem.ingredients}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View image modal */}
      <Dialog open={!!viewItem} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader className="px-3 pt-2">
            <DialogTitle>{viewItem?.name}</DialogTitle>
          </DialogHeader>
          {viewItem?.image && (
            <img src={viewItem.image} alt={viewItem.name} className="mx-auto max-h-[70vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
