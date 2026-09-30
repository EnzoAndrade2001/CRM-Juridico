// Gera, apos o build, um HTML estatico por rota publica (dist/<rota>/index.html)
// com title, description, canonical, Open Graph e um resumo do conteudo dentro
// de #root. Assim os buscadores recebem texto e metadados corretos sem
// precisar executar o JavaScript; o React substitui o resumo ao montar.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const SITE = 'https://pbladvocacia.com.br';
const NAME = 'Pedro Bastos Lund';
const load = (file) => JSON.parse(readFileSync(join(root, 'src/content', file), 'utf-8'));

const site = load('institutional-site.json');
const landings = {
  'revisional-bancario': load('revisional-bancario.json'),
  'registro-de-marca': load('registro-de-marca.json'),
  autismo: load('autismo.json'),
};

const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const p = (text) => (text ? `<p>${esc(text)}</p>` : '');

const pages = [
  {
    path: '/',
    title: `${NAME} | Advocacia e Consultoria Jurídica`,
    description: site.meta.description,
    body: `<h1>${esc(`${site.hero.title} ${site.hero.titleBreak}`)}</h1>${p(site.meta.description)}<h2>Áreas de atuação</h2><ul>${site.areas.map((a) => `<li>${esc(a.title)}: ${esc(a.text)}</li>`).join('')}</ul>`,
  },
  {
    path: '/atuacao',
    title: `${site.sectionDetails.areas.title} | ${NAME}`,
    description: site.sectionDetails.areas.text,
    body: `<h1>${esc(site.sectionDetails.areas.title)}</h1>${p(site.sectionDetails.areas.text)}<ul>${site.areas.map((a) => `<li>${esc(a.title)}: ${esc(a.text)}</li>`).join('')}</ul>`,
  },
  {
    path: '/equipe',
    title: `${site.sectionDetails.team.title} | ${NAME}`,
    description: site.sectionDetails.team.text,
    body: `<h1>${esc(site.sectionDetails.team.title)}</h1>${site.team.members.map((m) => `<h2>${esc(m.name)}</h2>${p(m.extra)}${p(m.bio)}`).join('')}`,
  },
  ...Object.entries(landings).map(([slug, c]) => ({
    path: `/${slug}`,
    title: c.meta.title,
    description: c.meta.description,
    body: `<h1>${esc(`${c.hero.titleStart} ${c.hero.titleEmphasis}`)}</h1>${p(c.hero.lead)}`,
  })),
  ...site.blog.posts.map((post) => ({
    path: `/blog/${post.slug}`,
    title: `${post.title} | ${NAME}`,
    description: post.paragraphs.join(' ').slice(0, 155).trim() + '…',
    body: `<article><h1>${esc(post.title)}</h1>${post.paragraphs.map(p).join('')}</article>`,
  })),
];

const template = readFileSync(join(dist, 'index.html'), 'utf-8');
const setTag = (html, pattern, replacement) => {
  if (!pattern.test(html)) throw new Error(`Padrao nao encontrado no index.html: ${pattern}`);
  return html.replace(pattern, () => replacement);
};

for (const page of pages) {
  const url = page.path === '/' ? `${SITE}/` : `${SITE}${page.path}`;
  let html = template;
  html = setTag(html, /<title>.*?<\/title>/, `<title>${esc(page.title)}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(page.description)}" />`);
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(page.title)}" />`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(page.description)}" />`);
  html = setTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(page.title)}" />`);
  html = setTag(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(page.description)}" />`);
  html = setTag(html, /<div id="root"><\/div>/, `<div id="root">${page.body}</div>`);

  if (page.path === '/') {
    writeFileSync(join(dist, 'index.html'), html);
  } else {
    const dir = join(dist, page.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
}
console.log(`prerender-seo: ${pages.length} paginas geradas`);
