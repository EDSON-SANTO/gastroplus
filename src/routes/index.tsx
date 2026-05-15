import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, MessageCircle, Star, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import heroImg from "@/assets/hero-food.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gastro+ — Descubra restaurantes e menus digitais" },
      { name: "description", content: "Pesquise restaurantes, veja menus leves com fotos e preços, e contacte por WhatsApp." },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [sort, setSort] = useState<"recent" | "rating">("recent");

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["restaurants", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, description, address, cover_image, rating, delivery_time, is_featured")
        .eq("status", "approved")
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let list = (restaurants ?? []).slice();
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((r) => r.name.toLowerCase().includes(term) || (r.address ?? "").toLowerCase().includes(term) || (r.description ?? "").toLowerCase().includes(term));
    if (onlyFeatured) list = list.filter((r) => r.is_featured);
    list.sort((a, b) => {
      if (sort === "rating") return Number(b.rating ?? 0) - Number(a.rating ?? 0);
      return 0; // already by recency from DB after we re-sort below
    });
    if (sort === "recent") {
      list.sort((a, b) => (b.is_featured === a.is_featured ? 0 : b.is_featured ? 1 : -1));
    }
    return list;
  }, [restaurants, q, onlyFeatured, sort]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" width={1536} height={896} className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-hero opacity-90" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-6xl">
            Os melhores sabores,<br/>a um clique.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/90 sm:text-lg">
            Descubra restaurantes, explore menus digitais e contacte direto por WhatsApp.
          </p>
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl bg-background p-2 shadow-warm">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar restaurante ou zona…"
                className="h-11 border-0 pl-9 text-base focus-visible:ring-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* LIST */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Restaurantes</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} encontrado(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={onlyFeatured ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyFeatured((v) => !v)}
              className={onlyFeatured ? "bg-primary text-primary-foreground" : ""}
            >
              <Star className="mr-1.5 h-3.5 w-3.5" />Em destaque
            </Button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="recent">Mais recentes</option>
              <option value="rating">Melhor avaliados</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-warm p-10 text-center">
            <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-semibold">Nenhum resultado</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste a pesquisa ou os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to="/restaurant/$slug"
                params={{ slug: r.slug }}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-warm"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {r.cover_image ? (
                    <img src={r.cover_image} alt={r.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full bg-hero opacity-80" />
                  )}
                  {r.is_featured && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-card">
                      <Star className="h-3 w-3 fill-current" />Destaque
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg font-bold">{r.name}</h3>
                  {r.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{r.address}
                    </p>
                  )}
                  {r.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {r.rating && Number(r.rating) > 0 ? Number(r.rating).toFixed(1) : "Novo"}
                    </span>
                    {r.delivery_time && <span className="inline-flex items-center gap-1">⏱ {r.delivery_time}</span>}
                    <span className="inline-flex items-center gap-1 text-whatsapp"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
