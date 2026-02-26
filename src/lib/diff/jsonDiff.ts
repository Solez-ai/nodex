/**
 * Nodex — JSON Deep Diff Algorithm
 * Created by Samin Yeasar (github.com/Solez-ai | solez.vercel.app)
 */

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface DiffResult {
  /** Maps JSON paths (e.g. "users.0.name") to their change status */
  byPath: Record<string, DiffStatus>;
}

/**
 * Computes a deep structural diff between two values.
 * Deterministic: same inputs always produce the same output.
 */
export function computeDiff(a: unknown, b: unknown): DiffResult {
  const byPath: Record<string, DiffStatus> = {};
  diffRecursive(a, b, "", byPath);
  return { byPath };
}

function diffRecursive(a: unknown, b: unknown, path: string, result: Record<string, DiffStatus>) {
  // Both sides are null / primitive
  if (!isObject(a) && !isObject(b)) {
    if (path === "") return; // root-level primitive edge case
    if (a === undefined && b !== undefined) {
      result[path] = "added";
    } else if (a !== undefined && b === undefined) {
      result[path] = "removed";
    } else if (!deepEqual(a, b)) {
      result[path] = "modified";
    } else {
      result[path] = "unchanged";
    }
    return;
  }

  // One side is object, other is not (type change = modified)
  if (isObject(a) !== isObject(b)) {
    result[path] = "modified";
    return;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

  let anyChange = false;

  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    const aVal = aObj[key];
    const bVal = bObj[key];

    if (!(key in aObj)) {
      // Key added
      markSubtree(bVal, childPath, "added", result);
      anyChange = true;
    } else if (!(key in bObj)) {
      // Key removed
      markSubtree(aVal, childPath, "removed", result);
      anyChange = true;
    } else {
      // Key exists in both
      const prevSize = Object.keys(result).length;
      diffRecursive(aVal, bVal, childPath, result);
      if (Object.keys(result).length > prevSize) {
        const changed = Object.entries(result)
          .slice(prevSize)
          .some(([, s]) => s !== "unchanged");
        if (changed) anyChange = true;
      }
    }
  }

  if (path) {
    result[path] = anyChange ? "modified" : "unchanged";
  }
}

/** Mark an entire subtree with a given status (for add/remove of whole objects) */
function markSubtree(
  value: unknown,
  path: string,
  status: DiffStatus,
  result: Record<string, DiffStatus>
) {
  result[path] = status;
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      markSubtree(child, `${path}.${key}`, status, result);
    }
  } else if (Array.isArray(value)) {
    (value as unknown[]).forEach((item, i) => {
      markSubtree(item, `${path}.${i}`, status, result);
    });
  }
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}
