interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div class="search-bar">
      <input type="text" placeholder="Filter: level:error route:/api service:my-app ..." value={value} onInput={(e) => onChange((e.target as HTMLInputElement).value)} />
    </div>
  );
}
