<p align="center">
  <img src="public/icons/icon-192.svg" alt="Lista de Compras" width="96" height="96" />
</p>

<h1 align="center">🛒 Lista de Compras</h1>

<p align="center">
  <em>Aplicativo familiar de lista de compras com sincronização em tempo real</em>
</p>

<p align="center">
  <a href="#-sobre">Sobre</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-funcionalidades">Funcionalidades</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-arquitetura">Arquitetura</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-tecnologias">Tecnologias</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-como-executar">Como executar</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-deploy">Deploy</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-estrutura">Estrutura</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/next.js-14.2-black?style=flat-square&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/react-18.3-61DAFB?style=flat-square&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/typescript-5.4-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tailwindcss-3.4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/turso-libSQL-4B8BF5?style=flat-square&logo=sqlite" alt="Turso" />
  <img src="https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/status-production-22c55e?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/license-MIT-6366f1?style=flat-square" alt="MIT" />
</p>

<br />

## 📋 Sobre

**Lista de Compras** é um aplicativo PWA para famílias gerenciarem suas listas de supermercado em conjunto. Ele sincroniza as alterações **em tempo real** entre todos os dispositivos da família — enquanto uma pessoa adiciona itens em casa, outra já vê as mudanças no celular dentro do mercado.

<br />

## ✨ Funcionalidades

<table>
  <tbody>
    <tr>
      <td align="center" width="33%">
        <strong>⚡ Sincronização em tempo real</strong><br />
        <sub>Polling inteligente a cada 4s com pausa em background e refetch ao reconectar</sub>
      </td>
      <td align="center" width="33%">
        <strong>📱 PWA completo</strong><br />
        <sub>Instalável como app nativo no celular com Service Worker e cache offline</sub>
      </td>
      <td align="center" width="33%">
        <strong>🔌 Funciona offline</strong><br />
        <sub>Mutações otimistas com fila de reenvio automática quando a conexão voltar</sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <strong>📸 Foto por item</strong><br />
        <sub>Tire foto dos produtos para identificação — carregada sob demanda</sub>
      </td>
      <td align="center">
        <strong>🏷️ Modo promoção</strong><br />
        <sub>Marque itens em promoção com destaque visual</sub>
      </td>
      <td align="center">
        <strong>📊 Progresso visual</strong><br />
        <sub>Barra de progresso mostrando quantos itens já foram comprados</sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <strong>🔍 Busca de itens</strong><br />
        <sub>Campo de busca que aparece automaticamente com mais de 8 itens</sub>
      </td>
      <td align="center">
        <strong>🗑️ Limpar comprados</strong><br />
        <sub>Remova todos os itens comprados de uma vez com confirmação</sub>
      </td>
      <td align="center">
        <strong>♿ Acessibilidade</strong><br />
        <sub>Ajuste do tamanho da fonte em 4 níveis para melhor legibilidade</sub>
      </td>
    </tr>
  </tbody>
</table>

<br />

## 🏗️ Arquitetura

```mermaid
graph TB
  subgraph "Frontend (Next.js 14)"
    A["pages/home<br/>Minhas Listas"]
    B["pages/lista<br/>[id] • Itens"]
    C["Components<br/>UI Kit"]
    D["Hooks<br/>useListSync / useListsSync"]
    E["Context<br/>Toast + FontSize"]
  end

  subgraph "Camada de Dados"
    F["API Routes<br/>REST endpoints"]
    G["Service Worker<br/>Cache-first"]
    H["Fila Offline<br/>QueuedMutation[]"]
  end

  subgraph "Database"
    I[("Turso / libSQL<br/>Serverless SQLite")]
  end

  A & B --> D
  D --> E
  D --> F
  F --> I
  D --> H
  H -->|"flush on reconnect"| F
  G -->|"cached assets"| A
  G -->|"cached assets"| B

  style I fill:#4B8BF5,stroke:#3b7de5,color:#fff
  style F fill:#6366f1,stroke:#5558e6,color:#fff
  style H fill:#f59e0b,stroke:#d97706,color:#fff
```

### 🔄 Fluxo de sincronização

```mermaid
sequenceDiagram
  participant D1 as 📱 Dispositivo A
  participant API as 🌐 API (Vercel)
  participant DB as 🗄️ Turso
  participant D2 as 📱 Dispositivo B

  Note over D1: Usuário marca item
  D1->>D1: Aplica otimista (instantâneo)
  D1->>API: PUT /api/items/:id
  API->>DB: UPDATE items SET is_checked=1
  API-->>D1: 200 OK

  loop Polling a cada 4s
    D2->>API: GET /api/lists/:id/items
    API->>DB: SELECT com has_photo
    DB-->>API: rows
    API-->>D2: JSON com is_checked=1
    D2->>D2: Atualiza estado
    Note over D2: Mudança visível em ≤ 4s
  end

  Note over D1: Perdeu conexão
  D1->>D1: Enfileira mutação
  D1->>D1: Mostra banner offline
  Note over D1: Conexão restaurada
  D1->>API: Flush da fila
  API-->>D1: Toast "Sincronizado"
```

<br />

## 🛠️ Tecnologias

| Categoria | Tecnologia |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) 5.4+ |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) 3.4+ |
| **Banco de dados** | [Turso](https://turso.tech/) (libSQL — SQLite serverless) |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **PWA** | Service Worker + Manifest + Cache API |
| **Hospedagem** | [Vercel](https://vercel.com/) (serverless) |

<br />

## 🚀 Como executar

### Pré-requisitos

- Node.js 18+
- Uma conta no [Turso](https://turso.tech/) (gratuita)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/LuisMarchio03/grocery-list.git
cd grocery-list

# 2. Instale as dependências
npm install

# 3. Configure o banco Turso
turso db create grocery-list
turso db show grocery-list --url    # copie a URL
turso db tokens create grocery-list # copie o token

# 4. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Turso

# 5. Inicie a aplicação
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) 🎉

<br />

## 🌍 Deploy

### Deploy na Vercel

O deploy é totalmente automatizado com o Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLuisMarchio03%2Fgrocery-list)

**Variáveis de ambiente obrigatórias no Vercel:**

| Variável | Descrição |
|---|---|
| `TURSO_DATABASE_URL` | URL de conexão do banco Turso |
| `TURSO_AUTH_TOKEN` | Token de autenticação do Turso |

```bash
# Ou faça deploy via CLI
npm i -g vercel
vercel --prod
```

### Schema do banco

Execute o script `schema.sql` no seu banco Turso:

```bash
turso db shell grocery-list < schema.sql
```

<br />

## 📁 Estrutura

```
📦 grocery-list
├── 📂 public                 # Assets estáticos
│   ├── 📂 icons              # Ícones PWA (192px, 512px)
│   ├── 📄 manifest.json      # Manifest do PWA
│   └── 📄 sw.js              # Service Worker
├── 📂 src
│   ├── 📂 app                # Next.js App Router
│   │   ├── 📂 api            # Rotas de API (REST)
│   │   │   ├── 📂 lists      # CRUD de listas
│   │   │   └── 📂 items      # CRUD de itens + foto
│   │   ├── 📂 lists/[id]     # Página de uma lista
│   │   ├── 📄 layout.tsx     # Layout global (PWA, metadados)
│   │   ├── 📄 page.tsx       # Home (minhas listas)
│   │   └── 📄 globals.css    # Estilos globais + animações
│   ├── 📂 components         # Componentes React
│   │   ├── 📄 AddItemForm    # Formulário de novo item
│   │   ├── 📄 ItemCard       # Card de item (check, foto, ações)
│   │   ├── 📄 PageHeader     # Cabeçalho com botão voltar
│   │   ├── 📄 SyncStatus     # Status de sincronização
│   │   ├── 📄 OfflineBanner  # Banner de modo offline
│   │   ├── 📄 ListProgress   # Barra de progresso
│   │   └── ...               # + componentes
│   └── 📂 lib                # Lógica e hooks
│       ├── 📂 sync           # Tipos, constantes, reconciliação
│       ├── 📄 db.ts          # Conexão com Turso
│       ├── 📄 useListSync    # Hook de sincronização de itens
│       ├── 📄 useListsSync   # Hook de sincronização de listas
│       └── ...
├── 📄 next.config.js         # Configuração Next.js
├── 📄 vercel.json            # Configuração Vercel
├── 📄 tailwind.config.ts     # Configuração Tailwind
├── 📄 tsconfig.json          # Configuração TypeScript
└── 📄 schema.sql             # Schema do banco de dados
```

<br />

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Feito com ❤️ para a família<br />
  <sub>Repo: <code>grocery-list</code> · App: <strong>Lista de Compras</strong></sub>
</p>
