import BrandMark from "./BrandMark";

function Header({ health, onHome }) {
  return (
    <header className="site-header">
      <button
        type="button"
        className="brand brand-button"
        onClick={onHome}
        aria-label="Kembali ke beranda"
        title="Kembali ke beranda"
      >
        <BrandMark />
        <span>
          Nusa<span>Stock</span>
        </span>
      </button>
      <div className="header-actions">
        <div className={`health ${health?.ok ? "health-ok" : "health-error"}`}>
          <span className="health-dot" />
          <span>{health?.ok ? `${health.total_documents} dokumen` : "Offline"}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
