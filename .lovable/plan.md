## Etapa 3 — Sistema completo de gestão dinâmica

A base já tem: autenticação (login/register), tabelas com RLS (`restaurants`, `menu_categories`, `menu_items`, `favorites`, `user_roles`, `profiles`, `reviews`, `promotions`), bucket `restaurant-images` público, funções `has_role`, `is_restaurant_owner`, `restaurant_is_public`. Vou construir por cima sem refazer.

---

### 1. Recuperação de senha
- `/forgot-password` — formulário envia email com `resetPasswordForEmail`
- `/reset-password` — lê token e atualiza senha via `updateUser`
- Link "Esqueci a senha" no `/login`

### 2. Favoritos (ligar UI ↔ DB)
- Botão coração na página do restaurante (`/restaurant/$slug`) — toggle insert/delete em `favorites`
- Botão coração nos cards da Home (autenticado)
- Página `/favorites` já existe — verificar lista funciona

### 3. Filtros e pesquisa na Home
- Barra de pesquisa (nome) + filtros: localização (texto), destaque, ordenação (rating/recente)
- Debounce na pesquisa, query reactiva

### 4. Painel Admin (`/admin`)
- Rota protegida via `_authenticated` + verificação `has_role('admin')`
- Lista de restaurantes (todos, incluindo `pending`)
- Acções: aprovar/rejeitar, destacar, apagar
- Criar restaurante manualmente

### 5. Painel Restaurante (`/dashboard`)
- Rota protegida — owner vê apenas os seus restaurantes
- Editar info (nome, descrição, endereço, whatsapp, cover)
- Gestão de categorias (CRUD, reorder por `position`)
- Gestão de itens do menu (CRUD, toggle disponibilidade, imagem, ingredientes)

### 6. Upload de imagens
- Componente reutilizável `ImageUpload` (cover restaurante, foto prato)
- Upload para `restaurant-images/{restaurant_id}/...`
- Compressão client-side (canvas, max 1200px, qualidade 0.8)
- Preview antes de salvar
- Limite de 3MB por ficheiro

### 7. Migration adicional
Política de Storage para o bucket `restaurant-images`:
- `SELECT` público (já é bucket público)
- `INSERT/UPDATE/DELETE` apenas para owner do restaurante (path começa com `{restaurant_id}/`) ou admin

### 8. UX
- `Skeleton` em listas (Home, dashboard, admin)
- Estados vazios (sem restaurantes, sem favoritos, sem itens)
- Toasts de feedback (sonner) em todas as mutações
- Loading buttons

### 9. Itens fora do âmbito desta etapa
- Reviews dinâmicas (tabela existe mas sem UI)
- Promoções (tabela existe mas sem UI)
- Onboarding do owner ao registar (criar restaurante automaticamente)

### Detalhes técnicos
- Toda a escrita usa o cliente browser do Supabase + RLS — sem server functions necessárias
- Atribuição de role `admin`: faço uma migration para promover o utilizador `demo-owner@sabores.local` a admin (ou o user que indicar). Dono comum continua com role `user`/`owner` e passa a `owner` ao criar um restaurante.
- Quando um owner se regista com `role=owner` no formulário, o trigger `handle_new_user` já dá role `owner` — mantenho.
- Bucket policies via SQL migration em `storage.objects`.

---

**Confirma:**
1. Promovo `demo-owner@sabores.local` a admin? Ou prefere outro email?
2. Avanço com tudo isto numa única implementação?
