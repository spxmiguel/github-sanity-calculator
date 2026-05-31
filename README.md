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
