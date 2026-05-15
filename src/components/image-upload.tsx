import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  restaurantId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: "video" | "square";
}

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_DIM = 1200;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas error"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha na compressão"))), "image/jpeg", 0.82);
    };
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = url;
  });
}

export function ImageUpload({ restaurantId, value, onChange, label = "Imagem", aspect = "video" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Ficheiro acima de 3MB.");
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const path = `${restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from("restaurant-images").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("restaurant-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem carregada.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className={`relative overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 ${aspect === "video" ? "aspect-[16/9]" : "aspect-square"}`}>
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow-card hover:bg-background"
              aria-label="Remover"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span>{busy ? "A carregar…" : "Clique para escolher"}</span>
            </button>
          </div>
        )}
      </div>
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />Substituir
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
