import { useState, useEffect, useRef, useCallback } from "react";
import { buildIndex, search } from "./searchEngine";
import faqData from "../public/faq.json";
import "./App.css";

const CATEGORIES = ["All", "Billing", "Technical", "Account"];

const SAMPLES = ["reset password", "charged twice", "file upload failing", "cancel subscription"];

function Badge({ category }) {
  const cls = category.toLowerCase();
  return (
      <span className={`badge badge-${cls}`}>
      <span className="badge-dot" />
        {category}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.round(score * 200));
  const color = pct >= 60 ? "#22c55e" : pct >= 35 ? "#f59e0b" : "#94a3b8";
  return (
      <div className="score-row">
        <div className="score-bar-bg">
          <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="score-label">{pct}% match</span>
      </div>
  );
}

function ResultCard({ faq, score, index }) {
  const preview = faq.answer.length > 150 ? faq.answer.slice(0, 150) + "…" : faq.answer;
  return (
      <div className="card" style={{ animationDelay: `${index * 70}ms` }}>
        <div className="card-rank">{index + 1}</div>
        <div className="card-top">
          <p className="card-question">{faq.question}</p>
          <Badge category={faq.category} />
        </div>
        <p className="card-answer">{preview}</p>
        <ScoreBar score={score} />
      </div>
  );
}

export default function App() {
  const [faqs, setFaqs]           = useState([]);
  const [ready, setReady]         = useState(false);
  const [query, setQuery]         = useState("");
  const [category, setCategory]   = useState("All");
  const [results, setResults]     = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError]         = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      buildIndex(faqData);
      setFaqs(faqData);
      setReady(true);
    } catch (e) {
      setError("Failed to load FAQ data. Please refresh.");
    }
  }, []);

  useEffect(() => { if (ready) inputRef.current?.focus(); }, [ready]);

  const handleSearch = useCallback(() => {
    setError("");
    if (!query.trim()) {
      setError("Please enter a question before searching.");
      return;
    }
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

  const handleClear = () => {
    setQuery(""); setResults(null); setError("");
    inputRef.current?.focus();
  };

  const handleSample = (q) => {
    setQuery(q); setResults(null); setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
      <div className="root">
        <header className="header">
          <div className="header-inner">
            <span className="logo-pill">FAQ</span>
            <h1>Knowledge Base Search</h1>
            <span className="header-sub">{faqs.length} articles</span>
          </div>
        </header>

        <main className="main">
          <div className="hero">
            <h2>How can we help?</h2>
            <p>Search our knowledge base — get instant answers ranked by relevance.</p>
          </div>

          <div className="search-card">
            <div className="input-row">
              <div className="input-wrap">
                <span className="input-icon">🔍</span>
                <input
                    ref={inputRef}
                    className="input"
                    type="text"
                    placeholder='Try "reset password" or "billing charge"…'
                    value={query}
                    disabled={!ready}
                    onChange={(e) => { setQuery(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    aria-label="Search FAQs"
                />
                {query && (
                    <button className="clear-btn" onClick={handleClear} aria-label="Clear search">✕</button>
                )}
              </div>
              <button className="search-btn" onClick={handleSearch} disabled={!ready || searching}>
                {searching ? "…" : "Search"}
              </button>
            </div>

            <div className="cat-row" role="group" aria-label="Filter by category">
              {CATEGORIES.map((c) => (
                  <button
                      key={c}
                      className={`cat-btn ${category === c ? "active" : ""}`}
                      onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
              ))}
            </div>
          </div>

          {error && <p className="validation" role="alert">⚠ {error}</p>}

          {results !== null && !error && (
              <section>
                {results.length === 0 ? (
                    <div className="no-results">
                      <div className="no-results-icon">🔍</div>
                      <p>No results found for <strong>"{query}"</strong></p>
                      <p className="hint">Try different keywords or broaden the category filter.</p>
                    </div>
                ) : (
                    <>
                      <div className="results-header">
                        <p className="results-meta">Results for <strong>"{query}"</strong></p>
                        <span className="results-count">{results.length} match{results.length !== 1 ? "es" : ""}</span>
                      </div>
                      <div className="results">
                        {results.map(({ faq, score }, i) => (
                            <ResultCard key={faq.id} faq={faq} score={score} index={i} />
                        ))}
                      </div>
                    </>
                )}
              </section>
          )}

          {results === null && ready && !error && (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>Type your question above to search the knowledge base.</p>
                <div className="sample-chips">
                  {SAMPLES.map((q) => (
                      <button key={q} className="chip" onClick={() => handleSample(q)}>
                        {q}
                      </button>
                  ))}
                </div>
              </div>
          )}
        </main>

        <footer className="footer">
          Powered by TF-IDF + Cosine Similarity · Pure JavaScript · No API required
        </footer>
      </div>
  );
}