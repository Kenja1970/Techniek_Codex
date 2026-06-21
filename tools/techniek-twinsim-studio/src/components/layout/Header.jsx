export default function Header({ items, activePage, onNavigate }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => onNavigate("home")} aria-label="Go to home">
        <img src="/logo-mark.svg" alt="" />
        <span>
          <strong>Techniek</strong>
          <small>TwinSim Studio</small>
        </span>
      </button>
      <nav className="nav-tabs" aria-label="Primary navigation">
        {items.map((item) => (
          <button
            key={item.id}
            className={activePage === item.id ? "active" : ""}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
