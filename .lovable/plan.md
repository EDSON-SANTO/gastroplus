# Relatório técnico académico — Sabores/Gastro+

Vou gerar **um único ficheiro Markdown** (`/mnt/documents/relatorio-tecnico-sabores.md`) com texto académico formal em PT-PT, pronto para copiar para o TCC. Sem alterações ao código do projeto.

## Conteúdo do documento

1. **Identificação do projeto** — nome, propósito (plataforma web para descoberta e gestão de restaurantes), tipo de aplicação (web full-stack SSR responsiva mobile-first).

2. **Arquitectura geral** — diagrama ASCII:
   ```
   Browser (React 19 SSR)
        │
        ▼
   TanStack Start (Cloudflare Workers — edge runtime)
        │  ├─ Server Functions (createServerFn)
        │  └─ Server Routes (/api/*)
        ▼
   Lovable Cloud  ──▶  PostgreSQL  +  Auth  +  Storage
                       (RLS + roles)
   ```

3. **Stack tecnológica** (tabela com versão e justificação académica de cada escolha):
   - Linguagem: TypeScript 5.8 (strict)
   - Framework: TanStack Start 1.x (SSR, file-based routing, type-safe)
   - UI: React 19, Tailwind CSS 4, shadcn/ui (Radix UI), lucide-react
   - Estado servidor: TanStack Query 5
   - Formulários: react-hook-form + zod
   - Backend-as-a-Service: Lovable Cloud (Supabase) — PostgreSQL, Auth, Storage
   - Cliente BD: @supabase/supabase-js 2
   - Hospedagem: Cloudflare Workers (edge)
   - Build: Vite 7

4. **Modelo de dados** — descrição das 9 tabelas:
   `profiles`, `user_roles`, `restaurants`, `restaurant_images`, `menu_categories`, `menu_items`, `promotions`, `reviews`, `favorites`.

5. **Segurança** — Row-Level Security, separação de roles em tabela `user_roles` com função `has_role()` SECURITY DEFINER (justificação: prevenção de escalada de privilégios), autenticação via JWT gerido pelo Supabase Auth.

6. **Funcionalidades implementadas** — autenticação (registo/login/recuperação), CRUD de restaurantes com fluxo de aprovação (pending → approved/rejected), editor de menus, favoritos, painel do proprietário, painel administrativo, upload de imagens, integração WhatsApp por deep-link.

7. **Justificação académica das escolhas** — vantagens de SSR vs SPA, edge computing, BaaS vs backend monolítico, design system com tokens semânticos OKLCH, acessibilidade via Radix.

8. **Ferramentas de suporte** — Lovable (geração assistida por IA), GitHub (versionamento), VS Code, Figma (opcional).

9. **Limitações e trabalho futuro** — secção curta a referir possíveis evoluções (app nativo, IA conversacional, visualizações 3D) sem afirmar que existem.

10. **Anexo A: `package.json`** — bloco de código completo.
11. **Anexo B: lista de rotas** — `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/restaurant/:slug`, `/dashboard`, `/admin`, `/favorites`.

## Entrega

Vou emitir uma `<presentation-artifact>` para descarregares o `.md`. Se preferires também em `.pdf`, diz no próximo turno e converto.
