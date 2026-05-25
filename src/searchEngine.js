/**
 * TF-IDF + Cosine Similarity Search Engine
 *
 * Approach:
 *  1. Tokenise each FAQ (question + answer) into lowercase word tokens,
 *     removing stop words and punctuation.
 *  2. Build an IDF table across the entire corpus.
 *  3. Represent each document as a TF-IDF vector (sparse map).
 *  4. At query time, build a TF-IDF vector for the query and compute
 *     cosine similarity against every document vector.
 *  5. Return results sorted by score, filtered by a minimum threshold.
 *
 * All computation is pure JavaScript — no backend, no paid APIs.
 */

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","it","its","be","was","are","were","been","has","have",
  "had","do","does","did","will","would","could","should","may","might",
  "i","my","me","we","our","you","your","they","their","this","that",
  "these","those","not","no","so","if","as","up","out","about","into",
  "can","also","how","what","why","when","where","who","which",
]);

/** Tokenise a string: lowercase, strip punctuation, remove stop words */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Term-frequency map for an array of tokens */
function termFrequency(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  // Normalise by document length
  for (const t in tf) tf[t] /= tokens.length;
  return tf;
}

/** Build IDF table from an array of token arrays (one per document) */
function buildIDF(tokenArrays) {
  const N = tokenArrays.length;
  const df = {};
  for (const tokens of tokenArrays) {
    for (const t of new Set(tokens)) df[t] = (df[t] || 0) + 1;
  }
  const idf = {};
  for (const t in df) idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; // smoothed
  return idf;
}

/** Compute TF-IDF vector (plain object term→weight) */
function tfidfVector(tf, idf) {
  const vec = {};
  for (const t in tf) {
    if (idf[t]) vec[t] = tf[t] * idf[t];
  }
  return vec;
}

/** L2 magnitude of a vector object */
function magnitude(vec) {
  return Math.sqrt(Object.values(vec).reduce((s, v) => s + v * v, 0));
}

/** Cosine similarity between two vector objects */
export function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (const t in vecA) {
    if (vecB[t]) dot += vecA[t] * vecB[t];
  }
  const mag = magnitude(vecA) * magnitude(vecB);
  return mag === 0 ? 0 : dot / mag;
}

// ─── Index state ──────────────────────────────────────────────────────────────
let _faqData = null;
let _docVectors = null;
let _idf = null;

/**
 * Build the TF-IDF index from FAQ array.
 * Call once at app startup.
 */
export function buildIndex(faqs) {
  _faqData = faqs;

  // Combine question + answer for richer matching
  const tokenArrays = faqs.map((f) => tokenize(`${f.question} ${f.answer}`));
  _idf = buildIDF(tokenArrays);
  _docVectors = tokenArrays.map((tokens) => tfidfVector(termFrequency(tokens), _idf));
}

/**
 * Search indexed FAQs.
 *
 * @param {string} query
 * @param {number} topK      Max results (default 3)
 * @param {string|null} category  Optional category filter
 * @returns {Array<{faq, score}>}
 * @throws {Error} if query is empty or index not built
 */
export function search(query, topK = 3, category = null) {
  if (!query || !query.trim()) throw new Error("Query must not be empty");
  if (!_faqData || !_docVectors) throw new Error("Index not built. Call buildIndex() first.");

  const qTokens = tokenize(query);
  const qVec = tfidfVector(termFrequency(qTokens), _idf);

  const THRESHOLD = 0.05;

  return _faqData
    .map((faq, i) => ({ faq, score: cosineSimilarity(qVec, _docVectors[i]) }))
    .filter(({ faq, score }) => score >= THRESHOLD && (!category || faq.category === category))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Test helper: inject pre-built state without needing real FAQ data */
export function _injectForTesting(faqs, docVectors, idf) {
  _faqData = faqs;
  _docVectors = docVectors;
  _idf = idf;
}
