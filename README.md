# Backend da POC — deploy no Railway

## 1. Aplicar o schema no MySQL do Railway
1. No Railway, abra o plugin **MySQL** que você já adicionou → aba **Data** (ou **Connect**) → copie a `MYSQL_PUBLIC_URL` (ou use o botão de conectar via terminal/MySQL Workbench/TablePlus).
2. Rode o conteúdo de `schema.sql` nesse banco (cole no editor SQL do Railway, ou via `mysql -h HOST -P PORTA -u USER -p DATABASE < schema.sql`).

## 2. Criar o serviço do backend
1. No mesmo projeto Railway (importante: **mesmo projeto** do MySQL, para herdar as variáveis automaticamente), clique em **+ New → GitHub Repo** (suba esta pasta `backend/` para um repositório) ou **Empty Service** + `railway up` via CLI apontando para esta pasta.
2. Em **Variables** do serviço do backend, adicione:
   - `JWT_SECRET` → gere um valor aleatório, ex.: `openssl rand -hex 32`
   - `CORS_ORIGIN` → a URL que você vai publicar no Hostinger (ex.: `https://seudominio.com`); use `*` só enquanto testa
   - As variáveis `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` **não precisam ser criadas manualmente** — o Railway já as injeta quando os dois serviços estão no mesmo projeto (é isso que `src/db.js` já espera).
3. Deploy. O Railway detecta o `package.json` e roda `npm install && npm start` automaticamente.

## 3. Popular os usuários de teste
Depois do primeiro deploy, rode uma vez (via `railway run npm run seed` na CLI, apontando para o serviço, ou temporariamente como comando único):
```
npm run seed
```
Isso cria `user1@acme.com`, `user2@acme.com`, `user3@acme.com`, todos com senha `123456`, na empresa "Acme Ltda" (2 licenças).

## 4. Testar
```
curl -X POST https://SEU-BACKEND.up.railway.app/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@acme.com","senha":"123456"}'
```
Repita com `user2` (deve funcionar) e `user3` (deve voltar `423 Locked`). Depois dê logout de um dos dois primeiros e tente `user3` de novo — deve entrar.

## Rodando localmente
```
cp .env.example .env   # preencha DB_HOST/DB_USER/DB_PASSWORD/DB_NAME com um MySQL local ou o público do Railway
npm install
npm run seed
npm start
```
