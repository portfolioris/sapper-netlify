import fs from 'fs';
import fm from 'front-matter';
import marked from 'marked';
import hljs from 'highlight.js';
import css from 'highlight.js/lib/languages/css';
import { getBooks, getMovies, getPages } from 'src/routes/$getDataFromApi';
import Figure from 'src/components/molecules/Figure.svelte';

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
  return {
    body: {
      foo: 'bar'
    }
  };
  const uri = '';
  // const uri = req.params.rest.join('/');
  const pagesCollection = getPages('content/pages');
  const pageData = pagesCollection.find((page) => page.uri === uri);

  if (!pageData) {
    // res.writeHead(404, { 'Content-Type': 'application/json' });
    // res.end(JSON.stringify({ message: 'Not found in lookup' }));
    // return;
  }

  const segments = [];

  const pathData = req.params.rest.map((segment) => {
    segments.push(segment);
    return pagesCollection.find((page) => page.uri === segments.join('/'));
  });

  const siteFile = fs.readFileSync('content/globals/site.md');
  const siteData = fm(siteFile.toString()).attributes;

  if (pageData.modules) {
    if (pageData.modules.some((module) => module.type === 'blogOverview')) {
      pageData.blogs = getPages('content/pages/blog', 'blog/');
    }

    if (pageData.modules.some((module) => module.type === 'movies')) {
      pageData.movies = await getMovies();
    }

    if (pageData.modules.some((module) => module.type === 'books')) {
      pageData.books = await getBooks();
    }
  }

  if (pageData.template === 'blog') {
    // get author info
    if (fs.existsSync(`content/authors/${pageData.author}.md`)) {
      const authorFile = fs.readFileSync(`content/authors/${pageData.author}.md`);
      pageData.author = fm(authorFile.toString()).attributes;
    }

    // get the body of the MD file, parse it
    const pageFile = fs.readFileSync(`content/pages/${uri}.md`);
    pageData.content = fm(pageFile.toString()).body;

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

  return {
    body: {
      // ...pageData,
      // site: siteData,
      // path: pathData,
    },
  };

  // res.writeHead(200, {
  //   'Content-Type': 'application/json',
  // });

  // res.end(JSON.stringify({
  //   ...pageData,
  //   site: siteData,
  //   path: pathData,
  // }));
}