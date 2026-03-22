interface ThemeToggleProps {
  theme: 'dark' | 'light' | 'system';
  onCycle: () => void;
}

export function ThemeToggle({ theme, onCycle }: ThemeToggleProps) {
  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥';
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <button class="theme-toggle" onClick={onCycle} title={`Theme: ${label} (click to change)`}>
      <span style="font-size:12px">{icon}</span>
    </button>
  );
}
