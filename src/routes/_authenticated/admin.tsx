import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Star, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Gastro+" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { roles, loading } = useAuth();
  const qc = useQueryClient();

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["admin-restaurants"],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">A carregar…</div>;
  if (!roles.includes("admin")) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">Apenas administradores podem aceder a esta página.</p>
        <Button asChild className="mt-6"><Link to="/">Voltar</Link></Button>
      </div>
    );
  }

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("restaurants").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Aprovado." : "Atualizado.");
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  };

  const toggleFeatured = async (r: any) => {
    const { error } = await supabase.from("restaurants").update({ is_featured: !r.is_featured }).eq("id", r.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar restaurante? Esta ação não pode ser revertida.")) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Apagado.");
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  };

  const pending = (restaurants ?? []).filter((r: any) => r.status === "pending");
  const others = (restaurants ?? []).filter((r: any) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Painel Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Aprove, destaque e gere todos os restaurantes.</p>

      {isLoading ? (
        <div className="mt-8 space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mt-8">
              <h2 className="font-semibold">Pendentes de aprovação ({pending.length})</h2>
              <div className="mt-3 space-y-2">
                {pending.map((r: any) => <Row key={r.id} r={r} onApprove={() => setStatus(r.id, "approved")} onReject={() => setStatus(r.id, "rejected")} onFeature={() => toggleFeatured(r)} onDelete={() => remove(r.id)} />)}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-semibold">Todos ({others.length})</h2>
            <div className="mt-3 space-y-2">
              {others.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem restaurantes.</p>
              ) : (
                others.map((r: any) => <Row key={r.id} r={r} onApprove={() => setStatus(r.id, "approved")} onReject={() => setStatus(r.id, "rejected")} onFeature={() => toggleFeatured(r)} onDelete={() => remove(r.id)} />)
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ r, onApprove, onReject, onFeature, onDelete }: any) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {r.cover_image && <img src={r.cover_image} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{r.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            r.status === "approved" ? "bg-success/15 text-success" :
            r.status === "pending" ? "bg-accent text-accent-foreground" :
            "bg-destructive/15 text-destructive"
          }`}>{r.status}</span>
          {r.is_featured && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
        </div>
        <p className="truncate text-xs text-muted-foreground">{r.address || "—"}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {r.status !== "approved" && (
          <Button variant="outline" size="sm" onClick={onApprove}><Check className="h-4 w-4 text-success" /></Button>
        )}
        {r.status !== "rejected" && (
          <Button variant="outline" size="sm" onClick={onReject}><X className="h-4 w-4 text-destructive" /></Button>
        )}
        <Button variant="outline" size="sm" onClick={onFeature} aria-label="Destaque">
          <Star className={`h-4 w-4 ${r.is_featured ? "fill-primary text-primary" : ""}`} />
        </Button>
        {r.slug && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/restaurant/$slug" params={{ slug: r.slug }}><ExternalLink className="h-4 w-4" /></Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
}
