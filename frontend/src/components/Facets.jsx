import { useState } from "react";

export function TypeFacets({ value, facets, onChange }) {
  const pdfCount = facets?.find((facet) => facet.value === "pdf")?.count;
  const webCount = facets?.find((facet) => facet.value === "web")?.count;
  const totalCount =
    typeof pdfCount === "number" && typeof webCount === "number"
      ? pdfCount + webCount
      : null;

  const labelWithCount = (label, count) =>
    typeof count === "number" ? `${label} (${count})` : label;

  return (
    <div className="filters" aria-label="Faceted search tipe dokumen">
      <button type="button" className={value === "" ? "active" : ""} onClick={() => onChange("")}>
        {labelWithCount("Semua", totalCount)}
      </button>
      <button
        type="button"
        className={value === "pdf" ? "active" : ""}
        onClick={() => onChange("pdf")}
      >
        {labelWithCount("PDF", pdfCount)}
      </button>
      <button
        type="button"
        className={value === "web" ? "active" : ""}
        onClick={() => onChange("web")}
      >
        {labelWithCount("Web", webCount)}
      </button>
    </div>
  );
}

export function YearFacets({ value, facets, loading, onChange }) {
  const [open, setOpen] = useState(true);
  const hasFacets = facets?.length > 0;

  if (!hasFacets && !loading) {
    return null;
  }

  return (
    <aside className={`year-facet-panel ${open ? "open" : "closed"}`} aria-label="Faceted search tahun">
      <button
        type="button"
        className="year-facet-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>
          <strong>Tahun</strong>
          <small>{value || "Semua tahun"}</small>
        </span>
        <i aria-hidden="true" />
      </button>

      {open && (
        <div className="year-facet-options">
          {hasFacets ? (
            <>
              <button
                type="button"
                className={value === "" ? "active" : ""}
                onClick={() => onChange("")}
              >
                <span>Semua tahun</span>
              </button>
              {facets.map((facet) => (
                <button
                  type="button"
                  key={facet.value}
                  className={value === facet.value ? "active" : ""}
                  onClick={() => onChange(facet.value)}
                >
                  <span>{facet.label}</span>
                  <strong>{facet.count}</strong>
                </button>
              ))}
            </>
          ) : (
            <div className="year-facet-loading">Memuat tahun...</div>
          )}
        </div>
      )}
    </aside>
  );
}
