// utils/vector_math.js
// Cosine similarity calculation using compute-cosine-similarity

import cosineSimilarity from 'compute-cosine-similarity';

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function getSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  const result = cosineSimilarity(vecA, vecB);
  return isNaN(result) ? 0 : result;
}

/**
 * Find the top-K most relevant chunks for a given query vector.
 * @param {number[]} queryVector - The embedding of the user query
 * @param {Array}    documents   - Array of { id, title, content, embedding }
 * @param {number}   k           - Number of results to return (default: 3)
 * @param {number}   threshold   - Minimum similarity score (default: 0.65)
 * @returns {Array} Sorted array of matching chunks with their scores
 */
export function retrieveTopK(queryVector, documents, k = 3, threshold = 0.65) {
  const scored = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    score: getSimilarity(queryVector, doc.embedding),
  }));

  return scored
    .filter((doc) => doc.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
