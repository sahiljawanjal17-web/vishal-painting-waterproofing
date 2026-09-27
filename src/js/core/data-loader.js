// Loads src/data/*.json once and caches the promise. URLs resolve relative to this
// module, so it works from index.html and team.html without path juggling.
// Needs http(s) — fetch() of local JSON is blocked on file:// — run any static server.

const cache = new Map();

export function loadData(name) {
  if (!cache.has(name)) {
    const url = new URL(`../../data/${name}.json`, import.meta.url);
    const request = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${name}.json (${res.status})`);
      return res.json();
    });
    // Drop failed entries so a retry can succeed.
    request.catch(() => cache.delete(name));
    cache.set(name, request);
  }
  return cache.get(name);
}

export async function loadAll(names) {
  const results = await Promise.all(names.map(loadData));
  return Object.fromEntries(names.map((name, i) => [name, results[i]]));
}
