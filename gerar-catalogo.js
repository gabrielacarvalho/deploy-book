// Deploy-Book: monta o catálogo do site a partir da pasta livros/.
// A Vercel roda este arquivo a cada atualização do repositório (veja vercel.json).
//
// Como funciona:
//  - Todo PDF ou EPUB dentro de livros/ entra no site automaticamente.
//  - A subpasta vira a matéria: livros/Docker/arquivo.pdf -> matéria "Docker".
//    Arquivos soltos direto em livros/ entram na matéria "Geral".
//  - O título vem do nome do arquivo: docker-compose-para-devs.pdf -> "Docker Compose para Devs".
//  - Um PDF e um EPUB com o mesmo nome viram um livro só, com os dois formatos.
//  - Capa: uma imagem em livros/capas/ com o mesmo nome do livro tem prioridade
//    (ex.: livros/capas/docker-compose-para-devs.jpg). Sem ela, a capa sai do próprio
//    arquivo: a capa embutida no EPUB ou a primeira página do PDF.
//  - Quem quiser detalhar um livro (autor, descrição...) adiciona um item em catalogo.json
//    apontando para o arquivo; os dados escritos ali têm prioridade.

const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const PASTA = path.join(RAIZ, "livros");
const MANUAL = path.join(RAIZ, "catalogo.json");
const SITE = path.join(RAIZ, "site");                // pasta publicada pela Vercel
const SAIDA = path.join(SITE, "catalogo-site.json");
const FORMATOS = [".pdf", ".epub"];
const IMAGENS = [".jpg", ".jpeg", ".png", ".webp"];
const PEQUENAS = new Set(["de", "da", "do", "das", "dos", "no", "na", "nos", "nas", "um", "uma", "ao", "e", "em", "para", "com", "a", "o", "as", "os",
  "for", "the", "of", "and", "to", "in", "on", "with"]);

const url = p => p.split(path.sep).map(encodeURIComponent).join("/");
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function titulo(nomeArquivo) {
  const palavras = nomeArquivo.replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
  return palavras.map((p, i) => {
    if (p !== p.toLowerCase()) return p;               // respeita quem já escreveu com maiúsculas
    if (i > 0 && PEQUENAS.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(" ");
}

function listar(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith(".")) return [];
    const p = path.join(pasta, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
}

const manual = fs.existsSync(MANUAL) ? JSON.parse(fs.readFileSync(MANUAL, "utf8")) : { itens: [] };
const itens = manual.itens || [];
const jaListados = new Set(itens.flatMap(it => (it.arquivos || []).map(a => decodeURIComponent(a.url))));

// capas por nome de arquivo
const capas = {};
listar(path.join(PASTA, "capas")).forEach(f => {
  if (IMAGENS.includes(path.extname(f).toLowerCase()))
    capas[slug(path.basename(f, path.extname(f)))] = url(path.relative(RAIZ, f));
});

// agrupa PDF + EPUB com o mesmo nome
const grupos = new Map();
listar(PASTA).forEach(f => {
  const ext = path.extname(f).toLowerCase();
  if (!FORMATOS.includes(ext)) return;
  const rel = path.relative(RAIZ, f);
  if (jaListados.has(rel.split(path.sep).join("/"))) return;
  const sub = path.relative(PASTA, path.dirname(f));
  const base = path.basename(f, path.extname(f));
  const chave = path.join(sub, slug(base));
  if (!grupos.has(chave)) grupos.set(chave, { sub, base, arquivos: [], data: 0 });
  const g = grupos.get(chave);
  g.arquivos.push({ formato: ext.slice(1), url: url(rel) });
  g.data = Math.max(g.data, fs.statSync(f).mtimeMs);
});

const ids = new Set(itens.map(i => i.id));
const automaticos = [...grupos.values()].map(g => {
  let id = slug(g.base) || "livro", n = 2;
  while (ids.has(id)) id = slug(g.base) + "-" + n++;
  ids.add(id);
  const item = {
    id,
    titulo: titulo(g.base),
    autor: "",
    materia: g.sub ? g.sub.split(path.sep)[0] : "Geral",
    descricao: "",
    arquivos: g.arquivos.sort((a, b) => a.formato.localeCompare(b.formato)),
  };
  if (capas[slug(g.base)]) item.capa = capas[slug(g.base)];
  return item;
});

// itens do catalogo.json sem capa também aproveitam livros/capas/
itens.forEach(it => { if (!it.capa && capas[it.id]) it.capa = capas[it.id]; });

// ---------- capas automáticas ----------
// Para cada livro sem capa, gera uma imagem a partir do próprio arquivo:
// a capa embutida no EPUB ou a primeira página do PDF. As imagens ficam em capas-auto/
// dentro de site/ e são criadas só no deploy (não precisam estar no repositório).
const PASTA_AUTO = path.join(SITE, "capas-auto");

async function capaDoEpub(arquivo, destinoSemExt) {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(arquivo));
  const container = await zip.file("META-INF/container.xml")?.async("string");
  const opfPath = container && (container.match(/full-path="([^"]+)"/) || [])[1];
  if (!opfPath) return null;
  const opf = await zip.file(opfPath)?.async("string");
  if (!opf) return null;
  const itensOpf = [...opf.matchAll(/<item\b[^>]*>/g)].map(m => {
    const tag = m[0], at = n => (tag.match(new RegExp(n + '="([^"]*)"')) || [])[1] || "";
    return { id: at("id"), href: at("href"), tipo: at("media-type"), props: at("properties") };
  }).filter(i => i.tipo.startsWith("image/"));
  const metaId = (opf.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/) ||
                  opf.match(/<meta[^>]*content="([^"]+)"[^>]*name="cover"/) || [])[1];
  const escolhida = itensOpf.find(i => /cover-image/.test(i.props)) ||
                    itensOpf.find(i => metaId && i.id === metaId) ||
                    itensOpf.find(i => /cover|capa/i.test(i.id + i.href));
  if (!escolhida) return null;
  const caminho = path.posix.join(path.posix.dirname(opfPath), decodeURIComponent(escolhida.href));
  const dados = await zip.file(caminho)?.async("nodebuffer");
  if (!dados) return null;
  const ext = { "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" }[escolhida.tipo] || ".jpg";
  fs.writeFileSync(destinoSemExt + ext, dados);
  return destinoSemExt + ext;
}

let pdfjs = null;
async function capaDoPdf(arquivo, destinoSemExt) {
  if (!pdfjs) pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(arquivo)), verbosity: 0 }).promise;
  try {
    const pagina = await doc.getPage(1);
    const v1 = pagina.getViewport({ scale: 1 });
    const vp = pagina.getViewport({ scale: 480 / v1.width });
    const { canvas, context } = doc.canvasFactory.create(Math.ceil(vp.width), Math.ceil(vp.height));
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: context, canvas, viewport: vp }).promise;
    const jpg = await canvas.encode("jpeg", 82);
    fs.writeFileSync(destinoSemExt + ".jpg", jpg);
    return destinoSemExt + ".jpg";
  } finally { await doc.destroy(); }
}

async function gerarCapas(lista) {
  let feitas = 0;
  for (const it of lista) {
    if (it.capa) continue;
    const locais = (it.arquivos || []).filter(a => !/^[a-z]+:\/\//i.test(a.url));
    const ordem = [...locais.filter(a => /epub/i.test(a.formato)), ...locais.filter(a => /pdf/i.test(a.formato))];
    for (const a of ordem) {
      const arquivo = path.join(RAIZ, ...decodeURIComponent(a.url).split("/"));
      if (!fs.existsSync(arquivo)) continue;
      try {
        fs.mkdirSync(PASTA_AUTO, { recursive: true });
        const destino = path.join(PASTA_AUTO, it.id);
        const feito = /epub/i.test(a.formato) ? await capaDoEpub(arquivo, destino) : await capaDoPdf(arquivo, destino);
        if (feito) { it.capa = url(path.relative(SITE, feito)); feitas++; break; }
      } catch (e) {
        console.log(`Capa não gerada para ${a.url}: ${e.message}`);
      }
    }
  }
  return feitas;
}

(async () => {
  // monta a pasta site/ com o que o visitante precisa
  fs.rmSync(SITE, { recursive: true, force: true });
  fs.mkdirSync(SITE, { recursive: true });
  fs.copyFileSync(path.join(RAIZ, "index.html"), path.join(SITE, "index.html"));
  if (fs.existsSync(PASTA)) fs.cpSync(PASTA, path.join(SITE, "livros"), { recursive: true });
  const todos = [...automaticos, ...itens];
  let feitas = 0;
  try { feitas = await gerarCapas(todos); }
  catch (e) { console.log("Capas automáticas indisponíveis:", e.message); }
  const hoje = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(SAIDA, JSON.stringify({ atualizado: hoje, itens: todos }, null, 2) + "\n");
  console.log(`Catálogo gerado: ${automaticos.length} livro(s) da pasta livros/ + ${itens.length} do catalogo.json, ${feitas} capa(s) criada(s)`);
})();
