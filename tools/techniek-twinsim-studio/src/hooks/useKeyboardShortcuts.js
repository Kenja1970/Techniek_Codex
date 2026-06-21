import { useEffect } from "react";

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
}

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(event) {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const meta = event.ctrlKey || event.metaKey;

      if (event.code === "Space") {
        event.preventDefault();
        handlers.toggleRun?.();
      } else if (key === "r" && !meta) {
        handlers.reset?.();
      } else if (key === "s" && !meta) {
        handlers.exportScenario?.();
      } else if (key === "i" && !meta) {
        handlers.importScenario?.();
      } else if (key === "delete" || key === "backspace") {
        handlers.deleteSelected?.();
      } else if (key === "d" && meta) {
        event.preventDefault();
        handlers.duplicateSelected?.();
      } else if (key === "z" && meta && event.shiftKey) {
        event.preventDefault();
        handlers.redo?.();
      } else if (key === "z" && meta) {
        event.preventDefault();
        handlers.undo?.();
      } else if (key === "e" && meta) {
        event.preventDefault();
        handlers.exportResults?.();
      } else if (key === "escape") {
        handlers.escape?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
