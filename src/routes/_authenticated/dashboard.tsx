import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";
import { MenuEditor } from "@/components/menu-editor";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Gastro+" }] }),
  component: DashboardPage,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [managingMenu, setManagingMenu] = useState<any | null>(null);

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["my-restaurants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">O meu painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie os seus restaurantes e menus.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-hero text-primary-foreground shadow-warm hover:opacity-90">
          <Plus className="mr-1.5 h-4 w-4" />Novo restaurante
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : !restaurants?.length ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">Ainda sem restaurantes</p>
            <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro para começar.</p>
          </div>
        ) : (
          restaurants.map((r: any) => (
            <div key={r.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {r.cover_image && <img src={r.cover_image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{r.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "approved" ? "bg-success/15 text-success" :
                    r.status === "pending" ? "bg-accent text-accent-foreground" :
                    "bg-destructive/15 text-destructive"
                  }`}>{r.status}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{r.address || "—"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => setManagingMenu(r)}>Menu</Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                </Button>
                {r.status === "approved" && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/restaurant/$slug" params={{ slug: r.slug }}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <RestaurantDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["my-restaurants"] });
          setCreating(false);
        }}
        ownerId={user?.id}
      />

      <RestaurantDialog
        open={!!editing}
        restaurant={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["my-restaurants"] });
          setEditing(null);
        }}
        ownerId={user?.id}
      />

      {managingMenu && (
        <Dialog open={!!managingMenu} onOpenChange={(o) => !o && setManagingMenu(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Menu — {managingMenu.name}</DialogTitle></DialogHeader>
            <MenuEditor restaurantId={managingMenu.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RestaurantDialog({
  open, onClose, onSaved, restaurant, ownerId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurant?: any;
  ownerId?: string;
}) {
  const isEdit = !!restaurant;
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // initialize form when opening
  const initialized = open && (form._init === (restaurant?.id ?? "new"));
  if (open && !initialized) {
    setForm({
      _init: restaurant?.id ?? "new",
      id: restaurant?.id,
      name: restaurant?.name ?? "",
      slug: restaurant?.slug ?? "",
      description: restaurant?.description ?? "",
      address: restaurant?.address ?? "",
      phone: restaurant?.phone ?? "",
      whatsapp: restaurant?.whatsapp ?? "",
      cover_image: restaurant?.cover_image ?? null,
      delivery_time: restaurant?.delivery_time ?? "",
    });
  }

  const save = async () => {
    if (!ownerId) return;
    if (!form.name?.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    const slug = form.slug?.trim() || slugify(form.name);
    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description || null,
      address: form.address || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      cover_image: form.cover_image,
      delivery_time: form.delivery_time || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("restaurants").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("restaurants").insert({ ...payload, owner_id: ownerId, status: "pending" }));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Atualizado!" : "Restaurante criado. Aguarda aprovação.");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar restaurante" : "Novo restaurante"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug (URL)</Label>
            <Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto a partir do nome" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+244..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tempo de entrega</Label>
            <Input value={form.delivery_time ?? ""} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} placeholder="30-45 min" />
          </div>
          {isEdit && form.id && (
            <ImageUpload
              restaurantId={form.id}
              value={form.cover_image}
              onChange={(url) => setForm({ ...form, cover_image: url })}
              label="Imagem de capa"
            />
          )}
          {!isEdit && (
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Imagens de capa podem ser carregadas depois de criar o restaurante.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-hero text-primary-foreground hover:opacity-90">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
