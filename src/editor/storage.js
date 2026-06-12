// storage.js — project persistence and sharing. All client-side:
// localStorage for auto-save and named projects, file download/upload for
// JSON export/import, and a compressed URL hash for share links.
// Layouts are pure data (dims, columns, finish, doors, hardware, loft),
// so JSON round-trips losslessly.

const CURRENT_KEY = 'wardrobeai.current';
const PROJECTS_KEY = 'wardrobeai.projects';

// Minimal shape check before trusting external/saved data.
export function isValidLayout(l) {
  return !!(
    l &&
    typeof l === 'object' &&
    l.dims &&
    Number(l.dims.width) > 0 &&
    Number(l.dims.height) > 0 &&
    Number(l.dims.depth) > 0 &&
    Array.isArray(l.columns) &&
    l.columns.length > 0 &&
    l.columns.every((c) => Array.isArray(c.items))
  );
}

// ---- auto-save (the design you were last working on) -----------------------

export function saveCurrent(layout) {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(layout));
  } catch {
    // storage unavailable — editing continues, just without resume
  }
}

export function loadCurrent() {
  try {
    const l = JSON.parse(localStorage.getItem(CURRENT_KEY));
    return isValidLayout(l) ? l : null;
  } catch {
    return null;
  }
}

// ---- named projects --------------------------------------------------------

export function listProjects() {
  try {
    const arr = JSON.parse(localStorage.getItem(PROJECTS_KEY));
    return Array.isArray(arr) ? arr.filter((p) => isValidLayout(p.layout)) : [];
  } catch {
    return [];
  }
}

function writeProjects(arr) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(arr));
  } catch {
    // ignore — caller already has the in-memory list
  }
}

export function saveProject(name, layout) {
  const projects = listProjects();
  const project = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim() || 'Untitled wardrobe',
    savedAt: new Date().toISOString(),
    layout,
  };
  projects.unshift(project);
  writeProjects(projects);
  return project;
}

export function deleteProject(id) {
  writeProjects(listProjects().filter((p) => p.id !== id));
}

// ---- JSON file export / import ---------------------------------------------

export function downloadJSON(layout, filename) {
  const blob = new Blob([JSON.stringify(layout, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, filename);
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const l = JSON.parse(reader.result);
        if (!isValidLayout(l)) throw new Error('not a wardrobe layout');
        resolve(l);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ---- share link (deflate-compressed layout in the URL hash) -----------------

const HASH_PREFIX = '#d=';

function bytesToBase64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipeThrough(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function buildShareUrl(layout) {
  const json = new TextEncoder().encode(JSON.stringify(layout));
  let encoded;
  if (typeof CompressionStream !== 'undefined') {
    const deflated = await pipeThrough(json, new CompressionStream('deflate-raw'));
    encoded = 'z' + bytesToBase64url(deflated);
  } else {
    encoded = 'p' + bytesToBase64url(json);
  }
  return (
    location.origin + location.pathname + location.search + HASH_PREFIX + encoded
  );
}

// Returns the shared layout if the current URL carries one, else null.
export async function loadFromHash() {
  if (!location.hash.startsWith(HASH_PREFIX)) return null;
  try {
    const encoded = location.hash.slice(HASH_PREFIX.length);
    const bytes = base64urlToBytes(encoded.slice(1));
    let json;
    if (encoded[0] === 'z') {
      json = await pipeThrough(bytes, new DecompressionStream('deflate-raw'));
    } else {
      json = bytes;
    }
    const l = JSON.parse(new TextDecoder().decode(json));
    return isValidLayout(l) ? l : null;
  } catch {
    return null;
  }
}

export function clearHash() {
  history.replaceState(null, '', location.pathname + location.search);
}
