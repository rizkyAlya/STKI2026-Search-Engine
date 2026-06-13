import { POPULAR_SEARCHES, PROJECT_INFO, TEAM_MEMBERS } from "../constants";

function InfoSidebar({ open, onToggle, onSearchSuggestion }) {
  return (
    <aside className={`info-sidebar ${open ? "open" : "closed"}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? "Tutup info" : "Buka info"}
      </button>

      {open && (
        <div className="sidebar-content">
          <article className="side-card">
            <h2>Pencarian Populer</h2>
            <div className="popular-list">
              {POPULAR_SEARCHES.map(([term, label], index) => (
                <button key={term} type="button" onClick={() => onSearchSuggestion(term)}>
                  <span>{index + 1}</span>
                  <strong>{term}</strong>
                  <small>{label}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="side-card">
            <h2>Kelompok 1</h2>
            <div className="team-list">
              {TEAM_MEMBERS.map(([name, studentId]) => (
                <div key={studentId}>
                  <strong>{name}</strong>
                  <span>{studentId}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="side-card">
            <h2>Tools & Data</h2>
            <div className="project-list">
              {PROJECT_INFO.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </aside>
  );
}

export default InfoSidebar;
