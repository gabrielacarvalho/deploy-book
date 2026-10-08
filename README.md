# Deploy-Book

Biblioteca aberta do grupo de estudos: PDFs e EPUBs de tecnologia, com busca, filtro por matéria e leitor de EPUB no navegador.

## Estrutura

```
index.html         → o site (não precisa mexer)
livros/            → os arquivos PDF e EPUB (subpastas = matérias)
livros/capas/      → capas opcionais
catalogo.json      → detalhes opcionais (autor, descrição) e os livros com link externo
gerar-catalogo.js  → monta o catálogo e as capas automaticamente (a Vercel roda sozinha)
package.json       → bibliotecas usadas para gerar as capas
vercel.json        → configuração da Vercel
```

## Publicar (Vercel)

O site está na Vercel, ligada a este repositório. Qualquer commit atualiza o site em menos de um minuto.

## Publicar no GitHub Pages (alternativa)

1. Crie um repositório público no GitHub chamado `deploy-book`.
2. Envie estes arquivos para ele (botão **Add file → Upload files**).
3. Vá em **Settings → Pages**, em *Source* escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em 1 ou 2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/deploy-book/`.

## Adicionar um material

**Jeito rápido:** suba o PDF ou EPUB para a pasta `livros/`. Pronto, a Vercel atualiza o site sozinha.

- **Matéria:** use subpastas. `livros/Docker/meu-livro.pdf` entra na matéria "Docker". Arquivos soltos em `livros/` entram em "Geral".
- **Título:** vem do nome do arquivo. `guia-de-redes-no-docker.pdf` vira "Guia de Redes no Docker".
- **PDF e EPUB do mesmo livro:** dê o mesmo nome aos dois, e eles viram um livro só.
- **Capa:** automática (primeira página do PDF ou capa do EPUB). Para escolher outra, suba uma imagem com o mesmo nome em `livros/capas/` (ex.: `livros/capas/guia-de-redes-no-docker.jpg`).

**Jeito detalhado (opcional):** para colocar autor, descrição ou outro título, adicione um item em `catalogo.json` apontando para o arquivo:

```json
{
  "id": "guia-redes-docker",
  "titulo": "Guia de Redes no Docker",
  "autor": "Fulana de Tal",
  "materia": "Docker",
  "descricao": "Bridge, host, overlay e DNS entre containers.",
  "arquivos": [
    { "formato": "pdf", "url": "livros/Docker/guia-de-redes-no-docker.pdf" }
  ]
}
```

O que estiver no `catalogo.json` tem prioridade sobre o automático.

**Como funciona por dentro:** a cada commit, a Vercel roda `gerar-catalogo.js` (configurado em `vercel.json`),
que lê a pasta `livros/` e o `catalogo.json`, cria as capas que faltam e monta a pasta `site/`, que é o que vai ao ar.

## Limites

- O GitHub aceita arquivos de até 100 MB cada, e o ideal é o repositório ficar abaixo de 1 GB.
  Para arquivos maiores, use o GitHub Releases ou o Cloudflare R2 e coloque o link completo em `url`.
- Para testar no computador, rode `python3 -m http.server` nesta pasta e abra `http://localhost:8000`
  (abrir o `index.html` direto com duplo clique não carrega o catálogo).

## Licenças

Só entram materiais do próprio grupo, com licença aberta (Creative Commons) ou liberados gratuitamente pelos autores. Livros comerciais ficam fora do site.
