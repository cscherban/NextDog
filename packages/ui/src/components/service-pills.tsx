interface ServicePillsProps {
  services: string[];
  active: Set<string>;
  onToggle: (name: string) => void;
}

export function ServicePills({ services, active, onToggle }: ServicePillsProps) {
  if (services.length === 0) return null;
  return (
    <div class="service-pills">
      {services.map((name) => (
        <button key={name} class={`pill ${active.has(name) ? 'active' : ''}`} onClick={() => onToggle(name)}>
          {name}
        </button>
      ))}
    </div>
  );
}
