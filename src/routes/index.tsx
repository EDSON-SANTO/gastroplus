import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, MessageCircle, Star } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-food.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sabores — Descubra restaurantes e menus digitais" },
      { name: "description", content: "Pesquise restaurantes, veja menus leves com fotos e preços, e contacte por WhatsApp." },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["restaurants", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, description, address, cover_image")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
  });

  const filtered = (restaurants ?? []).filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.address ?? "").toLowerCase().includes(q.toLowerCase())
  );

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
            <Button size="lg" className="h-11 bg-primary text-primary-foreground hover:opacity-90">Procurar</Button>
          </div>
        </div>
      </section>

      {/* LIST */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Restaurantes em destaque</h2>
            <p className="text-sm text-muted-foreground">Os locais mais recentes da nossa comunidade.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-warm p-10 text-center">
            <p className="font-display text-lg font-semibold">Ainda sem restaurantes aprovados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte em breve — novos sabores chegam todos os dias.
            </p>
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
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {r.cover_image ? (
                    <img src={r.cover_image} alt={r.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full bg-hero opacity-80" />
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
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-primary text-primary" /> Novo</span>
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
