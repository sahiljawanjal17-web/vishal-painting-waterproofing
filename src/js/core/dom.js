// DOM helpers. `el` builds nodes via textContent/setAttribute so data from JSON
// can never inject markup; `html` is the escape hatch for trusted constants only (icons).

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child != null && child !== false) node.append(child);
  }
  return node;
}

// Renders "The *mirror-smooth* method" → text nodes + <em>, without touching innerHTML.
export function emphasis(text) {
  const frag = document.createDocumentFragment();
  text.split('*').forEach((part, i) => {
    if (!part) return;
    frag.append(i % 2 ? el('em', { text: part }) : document.createTextNode(part));
  });
  return frag;
}
