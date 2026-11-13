# CANDI — Monorepo (execução 100% local)

> Candi, o Diário do Câncer ft. Rede Feminina de SCS — Projeto Integrador, Fatec São Caetano do Sul (2025-2026).

Este repositório reúne os três projetos do CANDI em um só lugar e substitui os serviços da AWS por
containers locais, para que o sistema inteiro possa ser apresentado sem depender da conta AWS.
**Nenhuma funcionalidade foi adicionada ou removida**: só mudou *onde* cada parte roda.

| Parte | Antes (AWS) | Agora (local) |
|---|---|---|
| App mobile (React Native / Expo) | Expo no computador | Expo no computador (emulador Android, iOS Simulator ou navegador) |
| Backend NestJS (REST + Socket.IO) | EC2 | container `candi-backend` — porta **3000** |
| Banco de dados (18 tabelas) | DynamoDB | container `amazon/dynamodb-local` — porta **8000** |
| Imagens e diários | Buckets S3 | container `luofuxiang/local-s3` — porta **8080** |
| API de IA (Gemini) | Lambda + Function URL | container `candi-ia-api` — porta **8001** |
| Google Gemini, e-mail (Gmail), login Google | internet | **continuam pela internet**, sem mudanças |

```
            App (Expo: emulador Android / navegador)
        REST + Socket.IO │         relatório │          fotos │
                         ▼                   ▼                ▼
   ┌─────────── docker compose ─────────────────────────────────────┐
   │  backend :3000 ──► dynamodb :8000 ◄── ia-api :8001 ───────────┼──► Gemini (internet)
   │        └──────────────────────────────────────► s3 :8080       │
   └────────────────────────────────────────────────────────────────┘
```

## Estrutura

```
CANDI/
├── mobile/              # antigo CANDI-mobile (pasta candi-app) — React Native + Expo 54
├── backend/             # antigo CANDI-backend-API — NestJS 11 + Fastify
│   └── Dockerfile
├── ia-api/              # antigo CANDI-ia-API — Lambda Python com Gemini
│   ├── mar2026-API/     # versão atual da Lambda (usada no container)
│   ├── local/server.py  # servidor HTTP que emula a Function URL da Lambda
│   └── Dockerfile
├── docker-compose.yml   # dynamodb + s3 + backend + ia-api
├── .env.example         # segredos e chaves (copiar para .env)
└── package.json         # atalhos (npm run up, npm run mobile, ...)
```

O histórico de commits dos três repositórios originais foi preservado (`git log -- backend/`, por exemplo).

## Pré-requisitos

- **Docker Desktop** (Windows/macOS) ou Docker Engine + Compose (Linux)
- **Node.js 20+** (recomendado 22) — para rodar o app com Expo
- **Android Studio** com um emulador criado (ou use o navegador com `npm run mobile:web`)
- Uma **chave do Google Gemini** (https://aistudio.google.com/apikey) para o Relatório de Saúde

## Como rodar

### 1. Configurar as variáveis

```bash
cp .env.example .env        # no Windows (PowerShell): copy .env.example .env
```

Preencha pelo menos `CHAVE_API` (Gemini). Para convites e recuperação de senha por e-mail,
preencha também `SMTP_USER` e `SMTP_PASS` (senha de app do Gmail). O resto já tem valores de demonstração.

### 2. Subir os serviços (banco, S3, backend e IA)

```bash
docker compose up -d --build     # ou: npm run up
docker compose ps                # todos devem ficar "running"/"healthy"
```

Na primeira subida o backend cria sozinho as 18 tabelas do DynamoDB e os 2 buckets do S3.
Confira com `docker compose logs backend` (aparecem as linhas `✅ Tabela criada` e `✅ Bucket criado`).

Teste rápido:

```bash
curl http://localhost:8001/      # IA: {"status": "healthy", "dynamodb": "connected", ...}
```

### 3. Rodar o app

```bash
npm run mobile:install           # primeira vez (equivale a: cd mobile && npm install)
```

**Emulador Android** (recomendado para a apresentação):

1. Abra o emulador pelo Android Studio.
2. Redirecione as portas para que `localhost` dentro do emulador seja o seu computador:
   ```bash
   npm run android:portas        # adb reverse das portas 3000, 8001 e 8080
   ```
   Repita sempre que o emulador for reiniciado. O `adb` fica em
   `%LOCALAPPDATA%\Android\Sdk\platform-tools` no Windows (adicione ao PATH).
3. Inicie o Expo e pressione `a`:
   ```bash
   npm run mobile
   ```

**Navegador:** `npm run mobile:web` (funciona direto com `localhost`).

**Celular físico pela rede Wi-Fi:** copie `mobile/.env.example` para `mobile/.env`, troque `localhost`
pelo IP do computador (ex.: `192.168.0.10`), faça o mesmo em `S3_PUBLIC_URL` no `.env` da raiz,
rode `docker compose up -d` de novo e inicie o Expo com `npx expo start -c`.

## Endereços

| Serviço | URL no computador | Observação |
|---|---|---|
| Backend | http://localhost:3000 | Socket.IO em `ws://localhost:3000/chat` |
| API de IA | http://localhost:8001 | `GET /` = health check, `POST /` `{"uid": "..."}` = relatório |
| S3 local | http://localhost:8080/{bucket}/{chave} | ex.: `/awscandi-image-uploads/profile-images/{id}.jpg` |
| DynamoDB local | http://localhost:8000 | acesse com `aws dynamodb list-tables --endpoint-url http://localhost:8000` |
| Expo (Metro) | http://localhost:8081 | |

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run up` | Sobe/reconstrói os containers |
| `npm run logs` | Logs do backend e da IA |
| `npm run status` | Estado dos containers |
| `npm run down` | Para tudo (os dados ficam salvos nos volumes) |
| `npm run reset` | Para tudo e **apaga** banco e arquivos (volta ao zero) |
| `npm run seed:admin` | Executa o script `seed-admin` original do backend (cria a conta admin definida no script e mostra e-mail/senha no terminal) |

Também é possível criar um admin pelo cadastro normal, informando o `ADMIN_SECRET` do `.env`.

**Relatório semanal da IA** — na AWS ele era disparado pelo EventBridge. Localmente, dispare manualmente
(no PowerShell use `curl.exe` em vez de `curl`):

```bash
curl -X POST http://localhost:8001/ -H "Content-Type: application/json" -d "{\"source\": \"candi.weekly-scheduler\"}"
```

## O que mudou no código

Somente configuração de endereços — a lógica de negócio é a mesma:

- **backend/**
  - `src/aws/aws-local.config.ts` (novo): lê `DYNAMODB_ENDPOINT`, `S3_ENDPOINT` e `S3_PUBLIC_URL`.
    Sem essas variáveis o backend volta a falar com a AWS exatamente como antes.
  - `dynamodb.module.ts`, `seed-admin.ts`, `s3.provider.ts`: usam o endpoint local quando definido.
  - `s3.provider.ts`: cria os buckets no S3 local na inicialização (como o `DynamoBootstrapService` já faz com as tabelas).
  - `diary`, `feed`, `community`, `profile-image`: a URL pública das imagens passa a ser montada por `s3ObjectUrl()`.
  - `Dockerfile`, `.dockerignore` (novos).
- **ia-api/**
  - `mar2026-API/main.py` **não foi alterado**. O boto3 usa o DynamoDB local pela variável `AWS_ENDPOINT_URL_DYNAMODB`.
  - `local/server.py` (novo): recebe o HTTP como a Function URL recebia e chama `lambda_handler`.
  - `Dockerfile`, `.dockerignore` (novos).
- **mobile/**
  - `src/constants/api.ts`: centraliza `API_BASE_URL`, `IA_API_URL` e a URL das fotos de perfil (configuráveis por `EXPO_PUBLIC_*`).
  - `relatorio.tsx` deixou de usar a URL fixa da Lambda; 9 telas/componentes deixaram de usar a URL fixa do bucket S3.

## Solução de problemas

| Sintoma | Causa provável / solução |
|---|---|
| App mostra "Erro de conexão" no emulador Android | Faltou `npm run android:portas` (ou o emulador foi reiniciado). |
| Relatório de Saúde dá erro | `CHAVE_API` vazia ou inválida. Veja `docker compose logs ia-api` e rode `docker compose up -d` após editar o `.env`. |
| Relatório retorna 404 | O usuário ainda não registrou sentimentos nem sintomas. |
| Fotos não aparecem | `S3_PUBLIC_URL` (raiz) ou `EXPO_PUBLIC_S3_URL` (mobile) não acessível pelo dispositivo. |
| Backend subiu sem tabelas | Rode `docker compose restart backend` (as tabelas são criadas na inicialização). |
| E-mails não chegam | `SMTP_USER`/`SMTP_PASS` vazios ou sem senha de app do Gmail. |
| Porta já em uso | Altere o lado esquerdo do mapeamento em `docker-compose.yml` (ex.: `"3001:3000"`) e o endereço correspondente em `mobile/.env`. |

## Equipe

- **Carolina Pichelli Souza** — dev front-end; designer; docs
- **Fernando Alcantara D´Ávila** — dev fullstack; cybersecurity
- **Guilherme Xavier Zanetti** — scrum master; dev fullstack; ai admin; docs
- **Heloísa Pichelli Souza** — analista de sistemas; dev front-end; UI/UX
- **Lucas Batista de Sousa** — dev back-end
- **Nuno Kasuo Tronco Yokoji** — DBA

A documentação técnica detalhada de cada parte continua em `mobile/README.md` e `backend/README.md`.
