import { useEffect, useState } from 'preact/hooks';
import { css } from 'styled-system/css';

interface ShortcutRow {
  /** One or more keys; multiple keys render as separate <kbd> chips. */
  keys: string[];
  desc: string;
}

interface ShortcutSection {
  title: string;
  rows: ShortcutRow[];
}

const sections: ShortcutSection[] = [
  {
    title: 'Navigation',
    rows: [
      { keys: ['j'], desc: 'Next row' },
      { keys: ['k'], desc: 'Previous row' },
      { keys: ['Enter'], desc: 'Open trace / select' },
      { keys: ['Esc'], desc: 'Close / go back' },
    ],
  },
  {
    title: 'Filter & views',
    rows: [
      { keys: ['/', '⌘/Ctrl+K'], desc: 'Focus filter' },
      { keys: ['Shift+X'], desc: 'Clear filter' },
      { keys: ['[', ']'], desc: 'Switch Spans / Logs' },
    ],
  },
  {
    title: 'In the filter bar',
    rows: [
      { keys: ['↑', '↓'], desc: 'Move through suggestions' },
      { keys: ['Tab'], desc: 'Complete suggestion' },
      { keys: ['Enter'], desc: 'Add filter token' },
      { keys: ['Backspace'], desc: 'Remove last token' },
      { keys: ['←'], desc: 'Edit last token' },
      { keys: ['Esc'], desc: 'Blur filter' },
    ],
  },
  {
    title: 'Help',
    rows: [{ keys: ['?'], desc: 'Toggle this help' }],
  },
];

const overlayStyle = css({
  position: 'fixed', inset: '0',
  background: 'rgba(0,0,0,0.5)', zIndex: 1000,
});

const dialogStyle = css({
  position: 'fixed', top: '50%', left: '50%',
  transform: 'translate(-50%,-50%)',
  background: 'surface.panel', border: '1px solid token(colors.border.subtle)',
  borderRadius: 'lg', py: '5', px: '6', zIndex: 1001,
  minWidth: '300px', maxHeight: '80vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
});

const titleStyle = css({
  fontSize: 'lg', fontWeight: '600', color: 'fg.bright', marginBottom: '3',
});

const sectionTitleStyle = css({
  fontSize: 'xs', fontWeight: '600', textTransform: 'uppercase',
  letterSpacing: '0.5px', color: 'fg.dim',
  marginTop: '3', marginBottom: '1',
});

const rowStyle = css({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  gap: '4', py: '1', px: '0', fontSize: 'md',
});

const keysCellStyle = css({
  display: 'flex', gap: '1', alignItems: 'center', flexShrink: 0,
});

const kbdStyle = css({
  background: 'surface.bg', border: '1px solid token(colors.border.subtle)',
  borderRadius: 'sm', py: '0', px: '1', fontFamily: 'mono',
  fontSize: 'sm', color: 'fg.bright', minWidth: '20px', textAlign: 'center',
});

const footerStyle = css({
  marginTop: '3', fontSize: 'sm', color: 'fg.dim', textAlign: 'center',
});

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
      <div className={overlayStyle} onClick={() => setOpen(false)} />
      <div className={dialogStyle}>
        <div className={titleStyle}>Keyboard Shortcuts</div>
        {sections.map((section) => (
          <div key={section.title}>
            <div className={sectionTitleStyle}>{section.title}</div>
            {section.rows.map((row) => (
              <div key={row.desc} className={rowStyle}>
                <span className={css({ color: 'fg.dim' })}>{row.desc}</span>
                <span className={keysCellStyle}>
                  {row.keys.map((key) => (
                    <kbd key={key} className={kbdStyle}>{key}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div className={footerStyle}>
          Press <kbd className={kbdStyle}>?</kbd> to close
        </div>
      </div>
    </>
  );
}
