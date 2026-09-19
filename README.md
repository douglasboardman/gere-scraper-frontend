# GERE Frontend

Interface web do **GERE — Gestão e Requisições em Contratações Públicas**.

O frontend oferece os fluxos de importação, consulta e gestão de contratações, contratos, fornecimentos e requisições. Consome a API do repositório irmão `gere-api`.

## O produto

O GERE converte dados de portais governamentais em capacidade operacional para unidades públicas:

```text
Contratações importadas
  -> atas, contratos, itens e fornecedores
  -> fornecimentos com saldo por unidade
  -> requisição de material, serviço ou outra obrigação
  -> análise, aprovação e empenho
```

A interface é multiunidade e adapta navegação e ações ao perfil. A autorização definitiva é responsabilidade da API.

## Stack

| Área | Tecnologia |
|---|---|
| UI | React 18 |
| Linguagem | TypeScript 5.7 |
| Build | Vite 6 |
| Rotas | React Router |
| Estado remoto | TanStack React Query 5 |
| Estado global local | Zustand 5 |
| HTTP | Axios |
| Formulários | React Hook Form + Zod |
| Estilos | Tailwind CSS 3 |
| Componentes | shadcn/ui + Radix UI |
| Tabelas | TanStack Table 8 |
| Feedback e ícones | Sonner + Lucide React |
| Exportação | ExcelJS |

## Áreas funcionais

### Painel

Resume contratações disponíveis/em processamento, contratos vigentes, fornecimentos disponíveis e requisições recentes. As consultas respeitam o escopo retornado pela API.

### Contratações

Permite listar contratações acessíveis, iniciar importação por número/ano/UASG/modalidade/amparo legal, acompanhar o job em tempo real, consultar elementos relacionados, controlar disponibilidade da participação e configurar regras da unidade.

Uma contratação compartilhada não é duplicada por unidade: a interface considera o status da participação da UASG atual.

### Atas e itens

Listagens e detalhes permitem navegar pelo encadeamento da contratação e, conforme perfil e estado, revisar descrições e disponibilidade.

### Contratos

Contratos podem ser cadastrados manualmente, importados das fontes consultadas pela API ou carregados em fluxos de renovação/importação de itens.

O painel de gestão exibe indicadores, vencimentos e fornecedores e permite sincronizar o cache do Portal da Transparência. Administradores escolhem a unidade de referência.

### Fornecimentos e fornecedores

Fornecimentos são ofertas utilizáveis por uma UASG, com quantidade autorizada, utilizada e saldo. São a origem dos itens de requisição.

Fornecedores possuem cadastro, contatos, relacionamentos e consulta de sanções no Portal da Transparência.

### Requisições

O wizard de nova requisição possui quatro etapas:

1. definir destinação, justificativa e observações;
2. escolher contratação ou outras obrigações;
3. selecionar fornecimentos e informar quantidade ou valor desejado;
4. revisar e enviar.

O backend recalcula valores e valida saldo, unidade e contratação. A interface apresenta conflitos de saldo e restrições configuradas.

```text
Rascunho -> Enviada -> Aprovada -> Empenhada
    ^          |
    |          +-> Rejeitada
    +-- devolução para edição
```

Há páginas para requisições próprias, da unidade, análise, detalhe, visualização e impressão sem layout.

### Outras obrigações

Gestores de unidade e administradores preparam uma contratação sintética anual para despesas fora das contratações importadas. A tela administra itens, contratos, fornecimentos, despesas e disponibilidade.

### Administração

- Administradores gerenciam unidades e todos os usuários.
- Gestores de unidade administram usuários no próprio escopo e perfis delegáveis.
- Usuários editam o próprio perfil e senha.
- Cadastro público cria conta pendente de aprovação.

## Perfis

| Perfil | Experiência principal |
|---|---|
| `admin` | visão global e administração |
| `gestor_orgao` | gestão ampla do órgão |
| `gestor_unidade` | gestão da unidade e aprovação |
| `gestor_contratacoes` | contratações e elementos |
| `gestor_contratos` | contratos, fornecedores e fornecimentos |
| `gestor_financeiro` | acompanhamento financeiro |
| `requisitante` | requisições próprias |

Permissões ficam em `src/hooks/usePermission.ts` e rotas protegidas em `src/router/index.tsx`. Elas melhoram a UX, mas não substituem os controles do backend.

## Arquitetura

```text
src/
├── api/                    # clientes HTTP por domínio
├── components/
│   ├── layout/             # menu, cabeçalho e barras de jobs
│   ├── shared/             # tabela, badges e diálogos
│   ├── ui/                 # primitives shadcn/Radix
│   └── icons/              # ícones específicos
├── hooks/                  # permissões, SSE e proteção de edição
├── lib/                    # queries, formatação, erros e exportação
├── pages/                  # telas por domínio
├── router/                 # rotas e proteção por perfil
├── store/                  # sessão Zustand
├── types/                  # contratos TypeScript
├── App.tsx
├── main.tsx
└── index.css
```

### Estado e cache

TanStack Query mantém dados da API. Chaves ficam em `src/lib/query-keys.ts`; mutations devem invalidar as chaves afetadas.

Zustand mantém usuário, JWT, autenticação e jobs ativos. Token e usuário são persistidos no `localStorage`; IDs de jobs não são persistidos para evitar reconexão a jobs antigos.

### HTTP e erros

`src/api/client.ts` adiciona Bearer token e normaliza erros NestJS. Respostas `401` encerram a sessão e redirecionam ao login. Chamadas públicas usam `src/api/public-client.ts`.

### SSE

`useSSEStream` usa `fetch` com `Authorization` e interpreta SSE sobre `ReadableStream`. Isso é intencional: `EventSource` não permite cabeçalhos personalizados e exporia o JWT na URL. O hook reconecta em falhas e trata `progress`, `done` e `error`.

## Rotas principais

| Rota | Finalidade |
|---|---|
| `/login` | autenticação |
| `/registro` | solicitação de cadastro |
| `/esqueci-senha` | recuperação de senha |
| `/redefinir-senha` | nova senha/ativação |
| `/dashboard` | painel geral |
| `/contratacoes` | contratações acessíveis |
| `/contratacoes/nova` | importação |
| `/atas` | atas |
| `/itens` | itens |
| `/fornecimentos` | fornecimentos |
| `/contratos` | contratos |
| `/contratos/dashboard` | gestão de contratos |
| `/fornecedores` | fornecedores e sanções |
| `/requisicoes/minhas_requisicoes` | requisições próprias |
| `/requisicoes/nova` | wizard de requisição |
| `/requisicoes` | requisições da unidade/global |
| `/requisicoes/pendentes` | fila de análise |
| `/outras-obrigacoes` | outras obrigações anuais |
| `/usuarios` | usuários |
| `/unidades` | unidades |
| `/perfil` | perfil atual |

Detalhes de várias entidades usam query strings em vez de parâmetros. Consulte o router antes de modificar links.

## Configuração

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
```

O cliente acrescenta `/api`; não o inclua em `VITE_API_URL`.

Sem a variável, usa `/api` relativo. Em desenvolvimento, o Vite encaminha `/api/*` para `http://localhost:3000` sem remover o prefixo, pois o NestJS também usa `/api`.

## Instalação e execução

Pré-requisitos: Node.js 18+, npm e `gere-api` configurado e em execução. Node.js 24.14.1 é recomendado para alinhar os projetos.

```bash
npm install
npm run dev
```

O Vite usa `http://localhost:5173` por padrão.

## Scripts

| Comando | Finalidade |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | type-check e bundle de produção |
| `npm run preview` | visualizar o bundle |

## Diretrizes de desenvolvimento

- Atualize tipos e clientes de API junto com contratos do backend.
- Use query keys centralizadas e invalide caches após mutations.
- Não trate permissões do frontend como segurança.
- Preserve escopo por unidade/UASG.
- Preserve cinco casas em quantidade/valor unitário e duas no total.
- Não coloque JWT em query string.
- Não armazene dados remotos de domínio no Zustand.
- Mantenha rotas e menu coerentes com `usePermission`.
- Trate erros com `getApiErrorMessage`.
- Proteja formulários contra perda acidental quando aplicável.

## Verificação

Ainda não há suíte automatizada de frontend versionada. A verificação mínima é:

```bash
npm run build
```

Também valide manualmente o fluxo afetado, perfis, estados vazios, erros e responsividade. Mudanças de integração devem executar os testes e build de `../gere-api`.

Consulte `../gere-api/README.md` para banco, variáveis, importações e autorização.
