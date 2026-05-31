# GitHub Sanity Calculator

Um web app divertido e completamente pseudocientifico que calcula a sanidade mental de um desenvolvedor usando dados publicos do GitHub.

## Rodar localmente

```bash
npm install
npm run dev
```

## Build estatico

```bash
npm run build
```

O app usa apenas a GitHub REST API publica no navegador e gera uma exportacao estatica em `out/`, pronta para GitHub Pages.

Para evitar limite de API, ele usa o modo economico:

- `GET /users/{username}`
- `GET /users/{username}/repos`
- `GET /users/{username}/events/public`

Tambem aceita um token opcional do GitHub no proprio navegador, salvo em `localStorage`, para aumentar o limite sem backend.

Os laudos ficam em cache local por 24 horas por username. Dentro desse periodo, novas analises do mesmo usuario reutilizam o resultado salvo e nao chamam a API de novo.

## API propria

Quando publicado em um ambiente com serverless functions, como Vercel, o app usa primeiro:

```txt
GET /api/analyze?username=octocat
```

Essa rota chama o GitHub no servidor, pode usar `GITHUB_TOKEN` como variavel de ambiente e responde com:

```txt
Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
```

Ou seja: o mesmo username fica cacheado por 24 horas na camada HTTP/CDN, reduzindo chamadas para o GitHub entre visitantes diferentes.

No GitHub Pages a rota `/api` nao existe, entao o app cai automaticamente para o modo estatico do navegador. Se quiser usar GitHub Pages com uma API em outro dominio, defina `NEXT_PUBLIC_ANALYZE_API_URL` no build apontando para a rota serverless.
