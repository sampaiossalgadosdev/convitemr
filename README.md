# Convite digital MR 15

## Páginas
- `/` — envelope → (clique) vídeo de abertura → convite estático com os 3 botões
- `/confirmar` — formulário de confirmação de presença (abre dentro do convite, sem trocar de página)
- `/presentes` — sugestões de presentes e tamanhos
- `/admin` — lista de confirmados (protegida por senha), com busca, remoção e download em planilha (CSV)

## Rodar local
```bash
npm install
ADMIN_PASSWORD=minhasenha npm start
# http://localhost:3000
```

## Subir no Railway
1. Suba esta pasta para um repositório no GitHub.
2. No Railway: **New Project → Deploy from GitHub repo** → escolha o repositório.
3. No mesmo projeto: **+ New → Database → PostgreSQL**.
4. No serviço do convite, aba **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referência ao banco criado)
   - `ADMIN_PASSWORD` = a senha que você quer usar no painel
5. Aba **Settings → Networking → Generate Domain** para ter o link público.

> Sem `DATABASE_URL`, os nomes ficam em `data/confirmacoes.json`. No Railway o disco é apagado a cada deploy,
> então use o Postgres (ou um Volume montado + variável `DATA_DIR` apontando para ele).

## Ajustes rápidos
No topo do `<script>` de `public/index.html`:
```js
const CONFIG = {
  mapa: 'https://www.google.com/maps/place/...' // link do local da festa no Google Maps
};
```
