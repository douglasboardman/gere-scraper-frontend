# GERE Frontend

**Gestao de Requisicoes** — Interface web do sistema de gestao de compras e requisicoes para orgaos publicos federais brasileiros.

O GERE permite importar compras do portal [ComprasGov](https://contratos.sistema.gov.br), gerenciar atas de registro de precos, itens, fornecedores e fornecimentos, alem de possibilitar a criacao e aprovacao de requisicoes de materiais pelas unidades participantes.

---

## Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Estilizacao | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Roteamento | React Router v6 |
| Estado global | Zustand (autenticacao) |
| Estado servidor | TanStack React Query v5 |
| Tabelas | TanStack React Table v8 |
| Formularios | React Hook Form + Zod |
| HTTP | Axios |
| Notificacoes | Sonner |
| Icones | Lucide React |

---

## Pre-requisitos

- Node.js >= 18
- Backend `gere-scraper` rodando na porta 3000 (ou conforme `VITE_API_URL`)

## Instalacao e Execucao

```bash
# Instalar dependencias
npm install

# Iniciar em modo desenvolvimento
npm run dev

# Build de producao
npm run build

# Visualizar build de producao
npm run preview
```

## Variaveis de Ambiente

Copie `.env.example` para `.env` e ajuste conforme necessario:

```env
VITE_API_URL=http://localhost:3000
```

Em modo de desenvolvimento, o Vite proxeia todas as requisicoes `/api/*` para o backend, removendo o prefixo `/api`. Isso permite que tanto chamadas REST (Axios) quanto conexoes SSE (EventSource) passem pelo mesmo proxy sem problemas de CORS.

---

## Perfis de Acesso

O sistema implementa controle de acesso baseado em tres perfis:

| Perfil | Permissoes |
|---|---|
| **admin** | Acesso total: gerenciar compras, atas, itens, fornecedores, fornecimentos, requisicoes, unidades e usuarios. Unico perfil que pode excluir compras e gerenciar usuarios. |
| **gestor_compras** | Gerenciar compras (importar, visualizar), atas, itens, fornecedores, fornecimentos, requisicoes (aprovar/rejeitar) e unidades. |
| **requerente** | Criar e gerenciar suas proprias requisicoes de materiais. |

---

## Funcionalidades

### Importacao de Compras
- Formulario simplificado com 4 campos: numero da compra, ano, UASG gestora e modalidade (Pregao, Concorrencia, Dispensa, Inexigibilidade)
- Para admin, campo adicional de selecao da unidade participante (listbox com unidades cadastradas)
- Para gestor_compras, a unidade participante e resolvida automaticamente pelo backend
- Acompanhamento em tempo real via barra de progresso SSE (Server-Sent Events) com reconexao automatica
- Re-import inteligente: quando uma compra ja processada e importada por outra unidade participante, o sistema reutiliza os dados existentes

### Gestao de Compras, Atas, Itens e Fornecimentos
- Listagem com tabelas paginadas, busca global e filtros por status
- Detalhamento individual de cada entidade
- Navegacao entre entidades relacionadas (Compra -> Atas -> Itens -> Fornecimentos) via icone padronizado
- Exclusao em cascata de compras (somente admin)

### Fornecedores
- Listagem com CNPJ formatado, endereco, contato
- Edicao de dados de contato (nome, email, telefone)
- Consulta de sancoes via Portal da Transparencia (CEIS, CNEP, CEPIM, CEAF) com modal detalhado

### Requisicoes de Materiais
- Fluxo completo: Rascunho -> Enviada -> Aprovada/Rejeitada -> Empenhada
- Adicao de itens a partir dos fornecimentos disponiveis com controle de saldo
- Calculo automatico de valores (unitario x quantidade)
- Aprovacao/rejeicao por gestor ou admin com campo de justificativa

### Administracao
- Gerenciamento de unidades organizacionais (UASG + UORG)
- Gerenciamento de usuarios: criacao, edicao de perfil/role, ativacao/desativacao, reset de senha
- Perfil pessoal com alteracao de nome e senha

---

## Estrutura do Projeto

```
src/
├── api/                    # Servicos de comunicacao com o backend
│   ├── client.ts           #   Axios com interceptors (token + 401)
│   ├── public-client.ts    #   Axios sem autenticacao (login, registro)
│   ├── compras.api.ts
│   ├── atas.api.ts
│   ├── itens.api.ts
│   ├── fornecedores.api.ts
│   ├── fornecimentos.api.ts
│   ├── requisicoes.api.ts
│   ├── itemRequisicao.api.ts
│   ├── usuarios.api.ts
│   ├── unidades.api.ts
│   ├── uorgs.api.ts
│   ├── jobs.api.ts
│   └── auth.api.ts
│
├── components/
│   ├── layout/             # Estrutura do app (sidebar, header, progress bar)
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ScrapingProgressBar.tsx
│   ├── shared/             # Componentes reutilizaveis de dominio
│   │   ├── DataTable.tsx       # Tabela generica (busca, paginacao, ordenacao)
│   │   ├── PageHeader.tsx      # Cabecalho de pagina
│   │   ├── StatusBadge.tsx     # Badge colorido por status
│   │   ├── ConfirmDialog.tsx   # Dialog de confirmacao
│   │   └── SancoesDialog.tsx   # Dialog de sancoes + hook useSancoesDialog
│   ├── icons/              # Icones SVG customizados
│   │   └── ManageSearchIcon.tsx
│   └── ui/                 # Primitivos shadcn/Radix UI
│
├── hooks/
│   ├── usePermission.ts    # Controle de acesso por role
│   └── useJobStream.ts     # Streaming SSE de progresso de jobs
│
├── pages/                  # Paginas organizadas por dominio
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── PerfilPage.tsx
│   ├── auth/               # Registro, esqueci senha, redefinir senha
│   ├── compras/            # Listagem, importacao, detalhamento
│   ├── atas/               # Listagem, detalhamento
│   ├── itens/              # Listagem, detalhamento
│   ├── fornecedores/       # Listagem, detalhamento, sancoes
│   ├── fornecimentos/      # Listagem, detalhamento
│   ├── requisicoes/        # Listagem, criacao, detalhamento, aprovacao
│   ├── unidades/           # Gerenciamento de unidades
│   └── usuarios/           # Gerenciamento de usuarios (admin)
│
├── router/                 # Definicao de rotas e protecao por role
├── store/                  # Zustand (estado de autenticacao)
├── types/                  # Interfaces TypeScript
├── lib/                    # Utilitarios (formatCNPJ, formatCurrency, cn)
├── App.tsx
├── main.tsx
└── index.css
```

---

## Rotas

### Publicas

| Rota | Pagina |
|---|---|
| `/login` | Login |
| `/registro` | Registro de novo usuario |
| `/esqueci-senha` | Recuperacao de senha |
| `/redefinir-senha` | Redefinicao via token |

### Protegidas (autenticado)

| Rota | Pagina | Restricao |
|---|---|---|
| `/dashboard` | Dashboard | — |
| `/compras` | Listagem de compras | — |
| `/compras/nova` | Importar compra | gestor_compras, admin |
| `/compras/:id` | Detalhes da compra | — |
| `/atas` | Listagem de atas | — |
| `/atas/:id` | Detalhes da ata | — |
| `/itens` | Listagem de itens | — |
| `/itens/:id` | Detalhes do item | — |
| `/fornecedores` | Listagem de fornecedores | — |
| `/fornecedores/:id` | Detalhes do fornecedor | — |
| `/fornecimentos` | Listagem de fornecimentos | — |
| `/fornecimentos/:id` | Detalhes do fornecimento | — |
| `/requisicoes` | Minhas requisicoes | — |
| `/requisicoes/nova` | Nova requisicao | — |
| `/requisicoes/:id` | Detalhes da requisicao | — |
| `/unidades` | Gerenciar unidades | gestor_compras, admin |
| `/usuarios` | Gerenciar usuarios | admin |
| `/usuarios/:id` | Editar usuario | admin |
| `/perfil` | Meu perfil | — |

---

## Fluxo de Autenticacao

1. Usuario informa email e senha em `/login`
2. Frontend envia `POST /auth/login` ao backend
3. Backend retorna `{ token, usuario }`
4. Token e dados do usuario sao armazenados no localStorage e no store Zustand
5. Todas as requisicoes subsequentes incluem `Authorization: Bearer {token}` via interceptor Axios
6. Respostas 401 limpam o token e redirecionam para `/login`

---

## Streaming SSE (Server-Sent Events)

O acompanhamento de jobs de scraping utiliza EventSource conectando a `/api/jobs/{jobId}/stream`:

- **`progress`** — atualiza percentual, contadores de atas/itens e mensagem
- **`done`** — marca como concluido (100%)
- **`error`** — sinaliza falha no job (evento customizado do backend)

O hook `useJobStream` implementa reconexao automatica (3 tentativas com intervalo de 3s) e distingue erros de conexao nativa de eventos de erro do backend.

---

## Scripts Disponiveis

| Comando | Descricao |
|---|---|
| `npm run dev` | Inicia servidor de desenvolvimento com HMR |
| `npm run build` | Verifica tipos (tsc) e gera build otimizado |
| `npm run preview` | Serve o build de producao localmente |
