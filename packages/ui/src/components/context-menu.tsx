import { useState, useEffect, useCallback, useRef } from 'preact/hooks';

export interface ContextMenuAction {
  label: string;
  onClick: () => void;
  icon?: string;
  danger?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  actions: ContextMenuAction[];
}

let globalShowMenu: ((state: ContextMenuState) => void) | null = null;

/** Show the global context menu at given position with given actions */
export function showContextMenu(x: number, y: number, actions: ContextMenuAction[]) {
  globalShowMenu?.({ x, y, actions });
}

/** Convenience: build standard actions for an attribute key:value pair */
export function attrContextActions(
  key: string,
  value: string,
  opts: {
    onFilter: (q: string) => void;
    onAddColumn?: (attrKey: string) => void;
    onRemoveColumn?: (attrKey: string) => void;
    isColumnActive?: boolean;
  }
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [
    {
      label: `Filter ${key}:${value}`,
      icon: '⊕',
      onClick: () => opts.onFilter(`${key}:${value}`),
    },
    {
      label: `Exclude ${key}:${value}`,
      icon: '⊖',
      onClick: () => opts.onFilter(`!${key}:${value}`),
    },
  ];

  if (opts.isColumnActive && opts.onRemoveColumn) {
    actions.push({
      label: `Hide "${key}" column`,
      icon: '◻',
      onClick: () => opts.onRemoveColumn!(key),
    });
  } else if (!opts.isColumnActive && opts.onAddColumn) {
    actions.push({
      label: `Show "${key}" as column`,
      icon: '◼',
      onClick: () => opts.onAddColumn!(key),
    });
  }

  return actions;
}

/** Global context menu container — render once in App */
export function ContextMenuContainer() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    globalShowMenu = setState;
    return () => { globalShowMenu = null; };
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!state) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setState(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState(null);
    };
    // Use capture to close before other handlers fire
    window.addEventListener('click', handleClick, true);
    window.addEventListener('contextmenu', handleClick, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('contextmenu', handleClick, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [state]);

  // Adjust position to stay in viewport
  const adjustedPos = useCallback((x: number, y: number) => {
    const menuWidth = 260;
    const menuHeight = 120;
    return {
      x: Math.min(x, window.innerWidth - menuWidth - 8),
      y: Math.min(y, window.innerHeight - menuHeight - 8),
    };
  }, []);

  if (!state) return null;

  const pos = adjustedPos(state.x, state.y);

  return (
    <div
      ref={menuRef}
      class="context-menu"
      style={`left:${pos.x}px;top:${pos.y}px`}
    >
      {state.actions.map((action, i) => (
        <div
          key={i}
          class={`context-menu-item ${action.danger ? 'context-menu-danger' : ''}`}
          onClick={() => { action.onClick(); setState(null); }}
        >
          {action.icon && <span class="context-menu-icon">{action.icon}</span>}
          <span>{action.label}</span>
        </div>
      ))}
    </div>
  );
}
