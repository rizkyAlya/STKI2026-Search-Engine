import {
  getBreadcrumbs,
  getOpenTarget,
  getResultTopics,
  safeHighlight,
} from "../utils/searchHelpers";

function DocumentIcon({ type }) {
  if (type === "pdf") {
    return (
      <span className="document-icon pdf-icon" title="PDF" aria-label="PDF">
        <span />
      </span>
    );
  }

  return (
    <span className="document-icon web-icon" title="Web" aria-label="Web">
      <span />
    </span>
  );
}

function ResultItem({ item }) {
  const openTarget = getOpenTarget(item);
  const title = item.judul || "Tanpa judul";
  const topics = getResultTopics(item);
  const breadcrumbs = getBreadcrumbs(item, topics);

  return (
    <article className="result-item">
      <div className="result-topline">
        <div className="result-meta">
          <DocumentIcon type={item.tipe} />
          <div className="source-block">
            <div className="source-trail" aria-label="Sumber dokumen">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`}>{crumb}</span>
              ))}
            </div>
            <div className="topic-badges" aria-label="Topik dokumen">
              {topics.length > 0 ? (
                topics.map((topic) => (
                  <span key={topic} className="topic-badge">
                    {topic}
                  </span>
                ))
              ) : (
                <span className="topic-badge muted">Dokumen</span>
              )}
            </div>
          </div>
        </div>
        {typeof item.relevansi === "number" && (
          <span className="relevance-badge">{item.relevansi}% relevansi</span>
        )}
      </div>

      <h2>
        {openTarget ? (
          <a className="title-link" href={openTarget} target="_blank" rel="noreferrer">
            {title}
          </a>
        ) : (
          title
        )}
      </h2>

      <p className="snippet" dangerouslySetInnerHTML={{ __html: safeHighlight(item.snippet) }} />
    </article>
  );
}

export default ResultItem;
