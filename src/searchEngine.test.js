import { describe, it, expect, beforeAll } from "vitest";
import { tokenize, cosineSimilarity, buildIndex, search } from "../src/searchEngine";

// ── Shared FAQ fixture ────────────────────────────────────────────────────────
const FAQS = [
  { id: 1, question: "How do I reset my password?", answer: "Click Forgot Password on the login page.", category: "Account" },
  { id: 2, question: "How do I update my billing information?", answer: "Go to Settings > Billing and update your payment method.", category: "Billing" },
  { id: 3, question: "Why is my account locked?", answer: "Accounts lock after 5 failed login attempts.", category: "Account" },
  { id: 4, question: "How do I cancel my subscription?", answer: "Go to Settings > Subscription > Cancel Plan.", category: "Billing" },
  { id: 5, question: "The app is running slowly or freezing.", answer: "Clear your browser cache and disable extensions.", category: "Technical" },
];

beforeAll(() => {
  buildIndex(FAQS);
});

// ── tokenize() ────────────────────────────────────────────────────────────────
describe("tokenize()", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("removes stop words", () => {
    const tokens = tokenize("how do I reset my password");
    expect(tokens).not.toContain("how");
    expect(tokens).not.toContain("do");
    expect(tokens).not.toContain("i");
    expect(tokens).not.toContain("my");
  });

  it("returns meaningful terms", () => {
    expect(tokenize("reset password login")).toContain("password");
    expect(tokenize("reset password login")).toContain("reset");
  });

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

// ── cosineSimilarity() ────────────────────────────────────────────────────────
describe("cosineSimilarity()", () => {
  it("returns 1 for identical vectors", () => {
    const v = { foo: 1, bar: 2 };
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("returns 0 for completely disjoint vectors", () => {
    expect(cosineSimilarity({ a: 1 }, { b: 1 })).toBe(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity({}, {})).toBe(0);
  });

  it("is symmetric", () => {
    const a = { x: 0.5, y: 0.8 };
    const b = { y: 0.3, z: 0.6 };
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
  });
});

// ── search() ─────────────────────────────────────────────────────────────────
describe("search()", () => {
  it("returns at least one result for a matching query", () => {
    const results = search("reset password");
    expect(results.length).toBeGreaterThan(0);
  });

  it("ranks the most relevant result first", () => {
    const results = search("reset password");
    expect(results[0].faq.id).toBe(1); // FAQ #1 is about password reset
  });

  it("returns at most topK results", () => {
    const results = search("account billing settings", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("throws for empty query", () => {
    expect(() => search("")).toThrow("Query must not be empty");
  });

  it("throws for whitespace-only query", () => {
    expect(() => search("   ")).toThrow("Query must not be empty");
  });

  it("filters by category correctly", () => {
    const results = search("settings update", 3, "Billing");
    results.forEach(({ faq }) => expect(faq.category).toBe("Billing"));
  });

  it("returns empty array when no results meet threshold", () => {
    const results = search("xyzzy quux nonexistent");
    expect(results).toEqual([]);
  });

  it("each result has a numeric score between 0 and 1", () => {
    const results = search("account locked login");
    results.forEach(({ score }) => {
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});
