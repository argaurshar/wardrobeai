export default function ColumnToolbar({
  columns,
  onDeleteColumn,
  onAddColumn,
  onEqualize,
  canAddCol,
}) {
  const canDelete = columns.length > 1;
  const canEqualize = columns.length > 1;
  return (
    <div className="mt-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural">
          Columns ({columns.length})
        </p>
        <div className="flex gap-2">
          <button
            onClick={onEqualize}
            disabled={!canEqualize}
            className="text-stone-300 text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border border-stone-700 hover:border-stone-500 hover:text-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Reset all columns to equal width"
          >
            ⇔ Equalize
          </button>
          <button
            onClick={onAddColumn}
            disabled={!canAddCol}
            className="text-stone-300 text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border border-stone-700 hover:border-stone-500 hover:text-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={
              canAddCol
                ? 'Re-split total width across one more column'
                : 'No room for another column without going below the minimum'
            }
          >
            + Add column
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {columns.map((col, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-md pl-4 pr-2 py-2"
          >
            <span className="text-stone-500 text-[10px] uppercase tracking-architectural">
              Col {i + 1}
            </span>
            <span className="text-stone-200 font-mono text-sm tabular-nums">
              {col.width}
              <span className="text-stone-600 text-xs ml-1">mm</span>
            </span>
            <span className="text-stone-700 text-xs">·</span>
            <span className="text-stone-500 text-xs">
              {col.items.length} item{col.items.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => onDeleteColumn(i)}
              disabled={!canDelete}
              className="ml-1 px-2 py-1 rounded text-rose-400 text-xs hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={canDelete ? 'Delete column' : "Can't delete the only column"}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="text-stone-600 text-[10px] mt-3 px-1">
        Add / Remove re-splits the wardrobe's total width across the new
        count. Equalize resets all columns to the same width.
      </p>
    </div>
  );
}
