import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// One-shot password reset endpoint. Remove after use.
export const Route = createFileRoute('/api/public/_admin-reset')({
  server: {
    handlers: {
      POST: async () => {
        const updates = [
          { id: '00000000-0000-0000-0000-000000000001', email: 'demo-owner@sabores.local', password: 'admin123' },
          { id: 'a5db9a3e-1685-438c-8e65-30d699a4bbde', email: 'teste@gmail.com', password: 'amigos123' },
        ];
        const results = [];
        for (const u of updates) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(u.id, { password: u.password });
          results.push({ email: u.email, ok: !error, error: error?.message });
        }
        return Response.json({ results });
      },
    },
  },
});
