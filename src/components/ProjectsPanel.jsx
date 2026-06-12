import { useEffect, useRef, useState } from 'react';
import {
  listProjects,
  saveProject,
  deleteProject,
  downloadJSON,
  readJSONFile,
} from '../editor/storage.js';

// Modal: save the current design under a name, load/delete saved projects,
// and move designs between devices via JSON export/import.
export default function ProjectsPanel({ layout, onLoadLayout, onClose }) {
  const [projects, setProjects] = useState(listProjects);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    saveProject(name, layout);
    setProjects(listProjects());
    setName('');
  };

  const handleDelete = (id) => {
    deleteProject(id);
    setProjects(listProjects());
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imported = await readJSONFile(file);
      onLoadLayout(imported);
      onClose();
    } catch {
      setError('That file is not a valid wardrobe design.');
    }
  };

  const d = layout.dims;

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-black/70 backdrop-blur-sm p-6 flex items-start justify-center"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-700 rounded-xl w-[520px] max-w-full my-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <h2 className="text-stone-100 text-base font-medium">Projects</h2>
          <p className="text-stone-500 text-[11px]">saved on this device</p>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto">
          <section>
            <h3 className="text-inkFaint text-[10px] uppercase tracking-architectural mb-2">
              Save current design ({d.width} × {d.height} × {d.depth} mm)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Sharma master bedroom"
                className="flex-1 bg-stone-800 border border-stone-700 rounded-md px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-accent/70 transition-colors"
              />
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-full bg-accent text-surround text-sm font-semibold hover:bg-accentHover active:scale-95 transition-all duration-200"
              >
                Save
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-inkFaint text-[10px] uppercase tracking-architectural mb-2">
              Saved projects
            </h3>
            {projects.length === 0 ? (
              <p className="text-stone-600 text-xs">Nothing saved yet.</p>
            ) : (
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-stone-800/60 border border-stone-800"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-stone-200 text-sm truncate">{p.name}</div>
                      <div className="text-stone-500 text-[10px] font-mono">
                        {p.layout.dims.width} × {p.layout.dims.height} ×{' '}
                        {p.layout.dims.depth} mm ·{' '}
                        {new Date(p.savedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadLayout(p.layout);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-full border border-stone-600 text-stone-200 text-xs hover:border-accent hover:text-accent transition-colors"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="px-2 py-1.5 text-stone-600 text-xs hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-inkFaint text-[10px] uppercase tracking-architectural mb-2">
              Move between devices
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadJSON(layout, `wardrobe-${d.width}x${d.height}.json`)
                }
                className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-xs hover:border-stone-500 hover:bg-stone-800/60 transition-all duration-200"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 text-xs hover:border-stone-500 hover:bg-stone-800/60 transition-all duration-200"
              >
                Import JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </section>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 hover:bg-stone-800/60 active:scale-95 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
