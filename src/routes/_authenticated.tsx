import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
      } else {
        setOk(true);
      }
    });
  }, []);
  if (ok === null) return <div className="p-10 text-center text-sm text-muted-foreground">A carregar…</div>;
  return <Outlet />;
}
