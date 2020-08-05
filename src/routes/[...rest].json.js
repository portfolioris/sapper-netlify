import fetch from 'node-fetch';
import glob from 'glob';
import fs from 'fs';
import path from 'path';
import fm from 'front-matter';
import marked from 'marked';
import hljs from 'highlight.js';
import css from 'highlight.js/lib/languages/css';
import { getBooks, getMovies } from './getDataFromApi';
import Figure from '../components/molecules/Figure.svelte';

hljs.registerLanguage('css', css);
const renderer = new marked.Renderer();

renderer.paragraph = (input) => {
  const hasImage = input.startsWith('<figure>');
  return hasImage ? input : `<p>${input}</p>`;
};

renderer.image = (href, title, text) => (
  Figure.render({
    figcaption: text,
    imgHref: href,
    alt: title,
  }).html);

export async function get(req, res) {
  let uri = req.params.rest.join('/');
  // if (uri === 'home') { // defined in index.svelte
  //   uri = '';
  // }

  const siteFile = fs.readFileSync('content/globals/site.md');
  const siteData = fm(siteFile.toString()).attributes;

  const pages = [];

  const files = glob.sync('**/*.md', {
    cwd: 'content/pages',
  });

  files.forEach((file) => {
    const fileData = fs.readFileSync(`content/pages/${file}`);
    const page = fm(fileData.toString()).attributes;
    page.uri = path.dirname(file);
    pages.push(page);
  });

  const pageData = pages.find((page) => page.uri === uri);

  if (!pageData) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found in lookup' }));
    return;
  }

  if (pageData.modules) {
    if (pageData.modules.some((module) => module.moduleTemplate === 'modular/blogoverview')) {
      const blogsQuery = await fetch(`${process.env.GRAV_API_URL}blog?data=blogs`);
      pageData.blogs = await blogsQuery.json();
    }

    if (pageData.modules.some((module) => module.type === 'movies')) {
      pageData.movies = await getMovies();
    }

    if (pageData.modules.some((module) => module.type === 'books')) {
      pageData.books = await getBooks();
    }
  }

  if (pageData.template === 'item') {
    pageData.content = marked(
      pageData.content,
      {
        renderer,
        highlight: (code, language) => {
          const validLanguage = hljs.getLanguage(language) ? language : 'css';
          return `<div class="c-codeblock">${hljs.highlight(validLanguage, code).value}</div>`;
        },
      },
    );
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
  });

  res.end(JSON.stringify({
    ...pageData,
    site: siteData,
    uri,
  }));
}
