# Redefinir senhas (Demo Owner + friends)

Como senhas ficam apenas como hash bcrypt, é necessário **sobrescrevê-las** usando a API admin do Supabase (service role). Não é possível ler as antigas.

## Novas senhas propostas (fáceis)

| Usuário | Email | Nova senha |
|---|---|---|
| Demo Owner (admin) | demo-owner@sabores.local | `admin123` |
| friends (owner) | teste@gmail.com | `amigos123` |

## Como será feito

1. Criar server function única e descartável `src/lib/admin-reset.functions.ts` usando `supabaseAdmin.auth.admin.updateUserById(id, { password })`.
2. Executar uma vez via `invoke-server-function` para cada usuário.
3. Remover o arquivo após confirmação (medida de segurança — não deixar endpoint de reset aberto no código).
4. Confirmar fazendo login de teste com as novas credenciais.

## Observações

- As senhas escolhidas são fracas e adequadas apenas para ambiente de demonstração. Para produção, recomendo trocar por senhas fortes ou usar o fluxo `/forgot-password`.
- Os emails, perfis e roles **não serão alterados** — apenas a senha.

Confirme (ou troque as senhas sugeridas) para eu implementar.
