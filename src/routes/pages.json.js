import getPages from '../getPages';

export function get(req, res, next) {
  const pages = getPages();

  res.writeHead(200, {
    'Content-Type': 'application/json',
  });

  // change Map() into a normal array
  const pageArray = [];

  pages.forEach((page, key) => {
    pageArray.push({
      slug: key,
      ...page,
    });
  });

  res.end(JSON.stringify(pageArray));
}
