import { useCallback, useEffect, useState } from 'react';

// useLayoutHistory — undo/redo for the layout state.
//
// Continuous drag operations call beginDrag once, then update() many times,
// then commitDrag once. The whole drag collapses into a single undo step.
// Atomic operations (popup save, add column, etc.) just call push() directly.
//
// State shape: { past[], present, future[], inDrag, snapshot }
//   past:    committed states older than present
//   future:  states ahead of present after undo (cleared on a new push)
//   inDrag:  whether a continuous drag is in progress
//   snapshot: present at the moment beginDrag was called — used to push the
//             pre-drag state into past when the drag commits.
export default function useLayoutHistory(initial) {
  const [state, setState] = useState({
    past: [],
    present: initial,
    future: [],
    inDrag: false,
    snapshot: null,
  });

  // Replace present with a new value (or via updater). Doesn't touch past/future.
  // Used during drags (when inDrag is true) AND for the initial preview pass.
  const update = useCallback((updater) => {
    setState((s) => {
      const next =
        typeof updater === 'function' ? updater(s.present) : updater;
      if (next === s.present) return s;
      return { ...s, present: next };
    });
  }, []);

  // Commit a new state: push current present onto past, set new present, clear future.
  const push = useCallback((updater) => {
    setState((s) => {
      const next =
        typeof updater === 'function' ? updater(s.present) : updater;
      if (next === s.present) return s;
      return {
        ...s,
        past: [...s.past, s.present],
        present: next,
        future: [],
      };
    });
  }, []);

  // Start a continuous drag — snapshot the current present so we can push it
  // to past when the drag commits.
  const beginDrag = useCallback(() => {
    setState((s) => (s.inDrag ? s : { ...s, inDrag: true, snapshot: s.present }));
  }, []);

  // Finish a continuous drag — push snapshot to past, keep current present.
  const commitDrag = useCallback(() => {
    setState((s) => {
      if (!s.inDrag) return s;
      if (s.snapshot === s.present) {
        return { ...s, inDrag: false, snapshot: null };
      }
      return {
        ...s,
        past: [...s.past, s.snapshot],
        future: [],
        inDrag: false,
        snapshot: null,
      };
    });
  }, []);

  // Cancel a drag — revert present to snapshot.
  const cancelDrag = useCallback(() => {
    setState((s) =>
      s.inDrag
        ? { ...s, present: s.snapshot, inDrag: false, snapshot: null }
        : s,
    );
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const last = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: last,
        future: [s.present, ...s.future],
        inDrag: false,
        snapshot: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      return {
        past: [...s.past, s.present],
        present: next,
        future: rest,
        inDrag: false,
        snapshot: null,
      };
    });
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl-Z, Cmd/Ctrl-Shift-Z (and Ctrl-Y on Windows).
  useEffect(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      // Skip when typing into an input
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return {
    present: state.present,
    update,
    push,
    beginDrag,
    commitDrag,
    cancelDrag,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
