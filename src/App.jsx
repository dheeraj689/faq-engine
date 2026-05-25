import { useState, useEffect, useRef, useCallback } from "react";
import { buildIndex, search } from "./searchEngine";
import "./App.css";

const CATEGORIES = ["All", "Billing", "Technical", "Account"];

const CAT_STYLES = {
  Billing:   { bg: "#fef9c3", border: "#ca8a04", text: "#854d0e" },
  Technical: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a8a" },
  Account:   { bg: "#dcfce7", border: "#16a34a", text: "#14532d" },
};

function Badge({ category }) {
  const s = CAT_STYLES[category] || {};
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      borderRadius: 99, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {category}
    </span>
  );
}

function ResultCard({ faq, score, index }) {
  const pct = Math.min(100, Math.round(score * 200)); // scale for display
  const preview = faq.answer.length > 140 ? faq.answer.slice(0, 140) + "…" : faq.answer;
  return (
    <div className="card" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="card-top">
        <p className="card-question">{faq.question}</p>
        <Badge category={faq.category} />
      </div>
      <p className="card-answer">{preview}</p>
      <div className="score-row">
        <div className="score-bar-bg">
          <div className="score-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="score-label">{pct}% match</span>
      </div>
    </div>
  );
}

export default function App() {
  const [faqs, setFaqs]         = useState([]);
  const [ready, setReady]       = useState(false);
  const [query, setQuery]       = useState("");
  const [category, setCategory] = useState("All");
  const [results, setResults]   = useState(null); // null = untouched
  const [searching, setSearching] = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    fetch("/faq.json")
      .then((r) => r.json())
      .then((data) => { buildIndex(data); setFaqs(data); setReady(true); })
      .catch(() => setError("Failed to load FAQ data."));
  }, []);

  useEffect(() => { if (ready) inputRef.current?.focus(); }, [ready]);

  const handleSearch = useCallback(() => {
    setError("");
    if (!query.trim()) { setError("Please enter a question before searching."); return; }
    setSearching(true);
    try {
      const cat = category === "All" ? null : category;
      setResults(search(query, 3, cat));
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }, [query, category]);

  const handleClear = () => { setQuery(""); setResults(null); setError(""); inputRef.current?.focus(); };

  return (
    <div className="root">
      <header className="header">
        <div className="header-inner">
          <span className="logo">❓</span>
          <div>
            <h1>FAQ Search</h1>
            <p>TF-IDF semantic search over {faqs.length} knowledge base articles</p>
          </div>
        </div>
      </header>

      <main className="main">
        {/* Search box */}
        <div className="search-box">
          <div className="input-row">
            <div className="input-wrap">
              <input
                ref={inputRef}
                className="input"
                type="text"
                placeholder='e.g. "reset password" or "billing charge"'
                value={query}
                disabled={!ready}
                onChange={(e) => { setQuery(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                aria-label="Search FAQs"
              />
              {query && <button className="clear-btn" onClick={handleClear}>✕</button>}
            </div>
            <button className="search-btn" onClick={handleSearch} disabled={!ready || searching}>
              {searching ? "…" : "Search"}
            </button>
          </div>

          <div className="cat-row">
            {CATEGORIES.map((c) => (
              <button key={c} className={`cat-btn ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Validation / error */}
        {error && <p className="validation" role="alert">{error}</p>}

        {/* Results */}
        {results !== null && !error && (
          <section>
            {results.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <p>No results found for <strong>"{query}"</strong></p>
                <p className="hint">Try different keywords or change the category filter.</p>
              </div>
            ) : (
              <>
                <p className="meta">Top {results.length} result{results.length !== 1 ? "s" : ""} for <em>"{query}"</em></p>
                <div className="results">
                  {results.map(({ faq, score }, i) => (
                    <ResultCard key={faq.id} faq={faq} score={score} index={i} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Empty state */}
        {results === null && ready && !error && (
          <div className="empty-state">
            <p>Search the knowledge base above.</p>
            <p className="hint">Try: "reset password" · "cancel subscription" · "file upload"</p>
          </div>
        )}
      </main>

      <footer className="footer">
        Powered by TF-IDF + Cosine Similarity · Pure JavaScript · No API required
      </footer>
    </div>
  );
}
