export interface DiffChunk {
  type: 'common' | 'removed' | 'added';
  value: string;
}

export interface DiffStats {
  removedCount: number;
  addedCount: number;
  commonCount: number;
}

/**
 * Computes word-level diff between original clause text and suggested redline text
 * using Longest Common Subsequence (LCS) alignment.
 */
export function computeWordDiff(
  oldText: string,
  newText: string
): { chunks: DiffChunk[]; stats: DiffStats } {
  const tokenize = (s: string) => s.match(/[\p{L}\p{M}\p{N}'-]+|[^\p{L}\p{M}\p{N}\s]+|\s+/gu) || [];
  const oldTokens = tokenize(oldText || '');
  const newTokens = tokenize(newText || '');
  const m = oldTokens.length;
  const n = newTokens.length;

  // dp table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldTokens[i] === newTokens[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const raw: DiffChunk[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      raw.unshift({ type: 'common', value: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: 'added', value: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      raw.unshift({ type: 'removed', value: oldTokens[i - 1] });
      i--;
    }
  }

  // Merge consecutive chunks of the same type for cleaner rendering
  const merged: DiffChunk[] = [];
  for (const item of raw) {
    if (merged.length > 0 && merged[merged.length - 1].type === item.type) {
      merged[merged.length - 1].value += item.value;
    } else {
      merged.push({ type: item.type, value: item.value });
    }
  }

  // Calculate word stats
  let removedCount = 0;
  let addedCount = 0;
  let commonCount = 0;

  for (const chunk of merged) {
    const words = (chunk.value.match(/[\p{L}\p{M}\p{N}'-]+/gu) || []).length;
    if (chunk.type === 'removed') removedCount += words;
    else if (chunk.type === 'added') addedCount += words;
    else commonCount += words;
  }

  return {
    chunks: merged,
    stats: { removedCount, addedCount, commonCount },
  };
}
