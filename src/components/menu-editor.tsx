import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";

export function MenuEditor({ restaurantId }: { restaurantId: string }) {
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const { data: categories, isLoading: lc } = useQuery({
    queryKey: ["adm-categories", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("position");
      return data ?? [];
    },
  });

  const { data: items, isLoading: li } = useQuery({
    queryKey: ["adm-items", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");
      return data ?? [];
    },
  });

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const pos = (categories?.length ?? 0);
    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: restaurantId,
      name: newCat.trim(),
      position: pos,
    });
    if (error) return toast.error(error.message);
    setNewCat("");
    qc.invalidateQueries({ queryKey: ["adm-categories", restaurantId] });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Apagar categoria? Os itens ficam sem categoria.")) return;
    await supabase.from("menu_items").update({ category_id: null }).eq("category_id", id);
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["adm-categories", restaurantId] });
    qc.invalidateQueries({ queryKey: ["adm-items", restaurantId] });
  };

  const toggleAvailable = async (it: any) => {
    await supabase.from("menu_items").update({ is_available: !it.is_available }).eq("id", it.id);
    qc.invalidateQueries({ queryKey: ["adm-items", restaurantId] });
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Apagar prato?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["adm-items", restaurantId] });
  };

  return (
    <div className="space-y-6">
      {/* Categorias */}
      <section>
        <h3 className="font-semibold">Categorias</h3>
        <div className="mt-2 flex gap-2">
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Ex: Entradas"
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <Button onClick={addCategory}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
        {lc ? (
          <Skeleton className="mt-2 h-10" />
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {(categories ?? []).map((c: any) => (
              <li key={c.id} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                {c.name}
                <button onClick={() => deleteCategory(c.id)} className="text-destructive hover:opacity-70" aria-label="Apagar">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {!categories?.length && <li className="text-xs text-muted-foreground">Sem categorias.</li>}
          </ul>
        )}
      </section>

      {/* Itens */}
      <section>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pratos</h3>
          <Button size="sm" onClick={() => setEditingItem({ restaurant_id: restaurantId, name: "", price: 0, is_available: true })}>
            <Plus className="mr-1 h-4 w-4" />Novo prato
          </Button>
        </div>
        {li ? (
          <div className="mt-3 space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : !items?.length ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sem pratos. Adicione o primeiro.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {items.map((it: any) => {
              const cat = categories?.find((c: any) => c.id === it.category_id);
              return (
                <li key={it.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                    {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(it.price).toLocaleString("pt-PT")} Kz {cat ? `· ${cat.name}` : ""}
                    </p>
                  </div>
                  <Switch checked={it.is_available} onCheckedChange={() => toggleAvailable(it)} />
                  <Button variant="ghost" size="icon" onClick={() => setEditingItem(it)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editingItem && (
        <ItemDialog
          item={editingItem}
          categories={categories ?? []}
          restaurantId={restaurantId}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["adm-items", restaurantId] });
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function ItemDialog({ item, categories, restaurantId, onClose, onSaved }: any) {
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Nome obrigatório.");
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price) || 0,
      image: form.image || null,
      ingredients: form.ingredients || null,
      category_id: form.category_id || null,
      is_available: form.is_available !== false,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("menu_items").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("menu_items").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado!");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar prato" : "Novo prato"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço (Kz)</Label>
              <Input type="number" min={0} value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.category_id ?? ""}
                onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
              >
                <option value="">— Nenhuma —</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Ingredientes</Label>
            <Textarea value={form.ingredients ?? ""} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} />
          </div>
          <ImageUpload
            restaurantId={restaurantId}
            value={form.image}
            onChange={(url) => setForm({ ...form, image: url })}
            label="Imagem do prato"
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="avail" className="cursor-pointer">Disponível</Label>
            <Switch id="avail" checked={form.is_available !== false} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-hero text-primary-foreground hover:opacity-90">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
