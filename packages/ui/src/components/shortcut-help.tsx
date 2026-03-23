import { useEffect, useState } from 'preact/hooks';

const shortcuts = [
  { key: 'j', desc: 'Next row' },
  { key: 'k', desc: 'Previous row' },
  { key: 'Enter', desc: 'Open trace / select' },
  { key: 'Esc', desc: 'Close / go back' },
  { key: '?', desc: 'Toggle this help' },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000"
        onClick={() => setOpen(false)}
      />
      <div style="
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:var(--bg-surface);border:1px solid var(--border);
        border-radius:8px;padding:20px 24px;z-index:1001;
        min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,0.3);
      ">
        <div style="font-size:13px;font-weight:600;color:var(--text-bright);margin-bottom:12px">
          Keyboard Shortcuts
        </div>
        {shortcuts.map(({ key, desc }) => (
          <div key={key} style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
            <span style="color:var(--text-dim)">{desc}</span>
            <kbd style="
              background:var(--bg);border:1px solid var(--border);
              border-radius:3px;padding:2px 6px;font-family:var(--mono);
              font-size:11px;color:var(--text-bright);min-width:20px;text-align:center;
            ">{key}</kbd>
          </div>
        ))}
        <div style="margin-top:12px;font-size:11px;color:var(--text-dim);text-align:center">
          Press <kbd style="background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:1px 4px;font-family:var(--mono);font-size:10px">?</kbd> to close
        </div>
      </div>
    </>
  );
}
