import { useEffect, useRef, useState } from 'react';
import { RULES } from '../engine/rules.js';
import {
  TYPE_LABELS,
  EDITABLE_TYPES,
  defaultHeightFor,
  minHeightFor,
  maxHeightWithRebalance,
  shrinkableSlack,
} from '../editor/columnOps.js';

// One popup, two modes. mode === 'add' inserts a new item; mode === 'edit'
// patches an existing item AND auto-rebalances the rest of the column so
// it stays exactly full to the inner height.
export default function ComponentEditPopup({
  mode, // 'edit' | 'add'
  item, // present in edit mode
  itemIdx,
  insertIdx,
  column,
  totalHeight,
  onCancel,
  onSave,
  onDelete,
  onRequestAdd,
}) {
  const isAdd = mode === 'add';

  const initialType = isAdd ? 'drawer' : item.type;
  const initialHeight = isAdd ? defaultHeightFor(initialType) : Math.round(item.height);

  const [type, setType] = useState(initialType);
  const [height, setHeight] = useState(initialHeight);
  const [width, setWidth] = useState(column.width);
  const [lit, setLit] = useState(isAdd ? false : !!item.lit);
  const heightRef = useRef(null);

  useEffect(() => {
    heightRef.current?.select();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const innerH = totalHeight - 2 * RULES.panelThickness;
  const heightNum = Number(height);
  const widthNum = Number(width);
  const minHeight = minHeightFor(type);

  // Different math for the two modes:
  // ADD: there's no edited item yet — we're adding ON TOP of the existing
  //      column. The new item must fit in inner − sum(currentItems).
  // EDIT: the edited item replaces itself. Other items can rebalance:
  //      shelves shrink (down to min) to make room, or grow to absorb slack.
  let maxHeight;
  let otherTotalAfter;
  if (isAdd) {
    const others = column.items.reduce((s, it) => s + it.height, 0);
    maxHeight = Math.max(0, innerH - others);
    otherTotalAfter = others; // no rebalance possible in add mode
  } else {
    maxHeight = maxHeightWithRebalance(column.items, itemIdx, innerH);
    otherTotalAfter = innerH - heightNum;
  }

  // What changes for the OTHER items? Positive = they shrink (we ate into
  // their shelves). Negative = they absorbed slack (shelves grew).
  let othersDelta = 0;
  if (!isAdd) {
    const othersCurrentTotal = column.items.reduce(
      (s, it, i) => (i === itemIdx ? s : s + it.height),
      0,
    );
    othersDelta = othersCurrentTotal - otherTotalAfter;
  }

  const tooSmall = heightNum < minHeight;
  const overflow = heightNum > maxHeight;
  const widthInRange =
    widthNum >= RULES.minColumnWidth && widthNum <= RULES.maxColumnWidth;
  const canSave =
    !tooSmall && !overflow && heightNum > 0 && (isAdd || widthInRange);

  // Stack indicator value: in edit mode, after a successful save the column
  // is always exactly full (= innerH). Show the *projected* total during typing
  // so users can see when they're outside the achievable range.
  const stackProjection = isAdd
    ? column.items.reduce((s, it) => s + it.height, 0) + heightNum
    : heightNum + (innerH - heightNum); // == innerH when valid; we show
  const stackForBar = isAdd ? stackProjection : Math.min(innerH, otherTotalAfter + heightNum);

  const save = () => {
    if (!canSave) return;
    if (isAdd) {
      onSave({ type, height: heightNum });
    } else {
      onSave({
        type,
        height: heightNum,
        columnWidth: widthNum,
        lit: type === 'shelf' ? lit : undefined,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center px-4 bg-black/65 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-xl p-7 w-[460px] max-w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-inkFaint text-[11px] uppercase tracking-architectural mb-1">
          {isAdd ? 'Add component' : 'Edit component'}
        </p>
        <p className="text-stone-500 text-xs mb-5">
          {isAdd
            ? `Column ${column.index + 1} · insert at position ${insertIdx + 1}`
            : `Column ${column.index + 1} · item ${itemIdx + 1} of ${column.items.length}`}
        </p>

        <label className="block mb-5">
          <span className="text-[10px] uppercase tracking-architectural text-stone-500 mb-2 block">
            Type
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-md px-3 py-2.5 text-stone-100 focus:outline-none focus:border-stone-500"
          >
            {EDITABLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        {isAdd ? (
          <div className="mb-5">
            <NumberField
              label="Height"
              value={height}
              onChange={setHeight}
              suffix="mm"
              hint={`max ${Math.max(0, maxHeight)}`}
              warn={overflow || tooSmall}
              inputRef={heightRef}
              onClampToMax={maxHeight > 0 ? () => setHeight(maxHeight) : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-5">
            <NumberField
              label="Column width"
              value={width}
              onChange={setWidth}
              suffix="mm"
              hint={`${RULES.minColumnWidth}–${RULES.maxColumnWidth}`}
              warn={!widthInRange}
            />
            <NumberField
              label="Height"
              value={height}
              onChange={setHeight}
              suffix="mm"
              hint={`max ${Math.max(0, maxHeight)}`}
              warn={overflow || tooSmall}
              inputRef={heightRef}
              onClampToMax={maxHeight > 0 ? () => setHeight(maxHeight) : undefined}
            />
          </div>
        )}

        {!isAdd && type === 'shelf' && (
          <LightingToggle value={lit} onChange={setLit} />
        )}

        <div className="mb-6 text-[11px] font-mono">
          <div className="flex items-center justify-between text-stone-500 uppercase tracking-wider mb-2">
            <span>stack</span>
            <span className={overflow ? 'text-amber-400' : 'text-stone-300'}>
              {Math.round(stackForBar)} / {innerH} mm
            </span>
          </div>
          <FillBar value={stackForBar} max={innerH} />

          {!isAdd && !overflow && !tooSmall && Math.abs(othersDelta) > 0.5 && (
            <p className="mt-3 text-stone-500 normal-case tracking-normal">
              {othersDelta > 0
                ? `shelves shrink by ${Math.round(othersDelta)} mm total`
                : `shelves absorb ${Math.round(-othersDelta)} mm slack`}
            </p>
          )}

          {overflow && (
            <p className="mt-3 text-amber-400 normal-case tracking-normal">
              {isAdd
                ? `Doesn't fit — column has ${Math.round(maxHeight)} mm free.`
                : `Shelves are already at their minimum — can't grow past ${maxHeight} mm. Shrink another item first.`}
            </p>
          )}
          {tooSmall && !overflow && (
            <p className="mt-3 text-amber-400 normal-case tracking-normal">
              Minimum height for a {TYPE_LABELS[type].toLowerCase()} is{' '}
              {minHeight} mm.
            </p>
          )}
        </div>

        {!isAdd && onRequestAdd && (
          <div className="flex gap-2 mb-5 text-xs">
            <button
              onClick={() => onRequestAdd(itemIdx + 1)}
              className="flex-1 px-3 py-2 rounded-md border border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800 transition-colors"
            >
              ↑ Insert above
            </button>
            <button
              onClick={() => onRequestAdd(itemIdx)}
              className="flex-1 px-3 py-2 rounded-md border border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800 transition-colors"
            >
              ↓ Insert below
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {!isAdd && onDelete ? (
            <button
              onClick={onDelete}
              disabled={column.items.length <= 1}
              className="px-4 py-2 rounded-full text-rose-400 text-sm hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={
                column.items.length <= 1
                  ? "Can't delete the only item in a column — delete the column instead"
                  : 'Delete this item'
              }
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-full border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!canSave}
              className="px-5 py-2 rounded-full bg-accent text-surround text-sm font-semibold hover:bg-accentHover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAdd ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, hint, warn, inputRef, onClampToMax }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-architectural text-stone-500 mb-2 flex justify-between items-baseline">
        <span>{label}</span>
        {hint && (
          <span
            onClick={onClampToMax}
            className={[
              'normal-case tracking-normal',
              onClampToMax ? 'cursor-pointer hover:text-stone-400 text-stone-600' : 'text-stone-700',
            ].join(' ')}
            title={onClampToMax ? 'Click to use max' : undefined}
          >
            {hint}
          </span>
        )}
      </span>
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'w-full bg-stone-950 border rounded-md px-3 py-2.5 text-stone-100 font-mono text-lg focus:outline-none',
            warn ? 'border-amber-500/60 focus:border-amber-400' : 'border-stone-800 focus:border-stone-500',
          ].join(' ')}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 text-xs">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function LightingToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={[
        'w-full mb-5 px-3 py-2.5 rounded-md border flex items-center justify-between transition-colors',
        value
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-600',
      ].join(' ')}
    >
      <span className="flex items-center gap-3">
        <span
          className={[
            'w-2.5 h-2.5 rounded-full',
            value ? 'bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,0.5)]' : 'bg-stone-700',
          ].join(' ')}
          aria-hidden
        />
        <span className="text-[10px] uppercase tracking-architectural">
          Shelf lighting
        </span>
      </span>
      <span className="text-xs">{value ? 'on' : 'off'}</span>
    </button>
  );
}

function FillBar({ value, max }) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div className="h-1 w-full bg-stone-800 rounded overflow-hidden">
      <div
        className={['h-full transition-all', over ? 'bg-amber-500' : 'bg-stone-500'].join(' ')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
