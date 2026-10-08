# Deploy-Book

Biblioteca aberta do grupo de estudos: PDFs e EPUBs de tecnologia, com busca, filtro por matéria e leitor de EPUB no navegador.

## Estrutura

```
index.html      → o site (não precisa mexer)
catalogo.json   → a lista de materiais (é aqui que vocês editam)
livros/         → os arquivos PDF e EPUB
```

## Publicar no GitHub Pages (grátis)

1. Crie um repositório público no GitHub chamado `deploy-book`.
2. Envie estes arquivos para ele (botão **Add file → Upload files**).
3. Vá em **Settings → Pages**, em *Source* escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em 1 ou 2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/deploy-book/`.

## Adicionar um material

1. Suba o arquivo para a pasta `livros/` (ex.: `livros/redes-osi.pdf`).
2. Adicione um item em `catalogo.json`:

```json
{
  "id": "redes-osi",
  "titulo": "Resumo de Redes: Modelo OSI",
  "autor": "Grupo Deploy-Book",
  "materia": "Redes",
  "idioma": "PT-BR",
  "licenca": "CC BY 4.0",
  "descricao": "As 7 camadas com exemplos.",
  "capa": "livros/capas/redes-osi.jpg",
  "arquivos": [
    { "formato": "pdf",  "url": "livros/redes-osi.pdf" },
    { "formato": "epub", "url": "livros/redes-osi.epub" }
  ]
}
```

- `id` precisa ser único, sem espaços.
- `capa` é opcional. Coloque a imagem em `livros/capas/` (JPG ou PNG, de preferência em pé, proporção 2:3).
  Sem `capa`, o site tira a capa do próprio arquivo: a capa do EPUB ou a primeira página do PDF.
  Se não houver arquivo, ele monta uma capa com o título, o autor e a cor da matéria.
- `materia` cria o filtro automaticamente; use sempre o mesmo nome.
- Para livros abertos de terceiros, prefira `"fonte": "https://pagina-oficial"` em vez de subir o arquivo.
- EPUBs dentro de `livros/` ganham o botão **Ler EPUB aqui**.

## Limites

- O GitHub aceita arquivos de até 100 MB cada, e o ideal é o repositório ficar abaixo de 1 GB.
  Para arquivos maiores, use o GitHub Releases ou o Cloudflare R2 e coloque o link completo em `url`.
- Para testar no computador, rode `python3 -m http.server` nesta pasta e abra `http://localhost:8000`
  (abrir o `index.html` direto com duplo clique não carrega o catálogo).

## Licenças

Só entram materiais do próprio grupo, com licença aberta (Creative Commons) ou liberados gratuitamente pelos autores. Livros comerciais ficam fora do site.
