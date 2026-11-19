import MiniSearch from "minisearch";
import { loadCustomExercises } from "./customExercises";
import { EXERCISE_CATALOGUE } from "./exercises";

/**
 * Name search for the catalogue and custom exercises.
 *
 * The catalogue index is built once. Custom names are reindexed only when that
 * list changes. Matching is name-only: lowercase, diacritics stripped, and
 * hyphens, apostrophes, slashes, brackets, and other separators ignored.
 * A squashed form (those separators removed) is indexed beside the words so
 * "dumb bell" matches "dumbbell". Words may arrive in any order. Prefixes match
 * while typing. Typos are allowed only on terms longer than three characters.
 */

const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

export function tokenize(text: string): string[] {
  return text.match(WORD_PATTERN) ?? [];
}

/** Lowercase and strip diacritics and leftover separators. Empty terms are dropped. */
export function processTerm(term: string): string | null {
  const folded = term.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
  const cleaned = folded.replace(/[^a-z0-9]+/g, "");
  return cleaned || null;
}

export function termsOf(text: string): string[] {
  const terms: string[] = [];
  for (const token of tokenize(text)) {
    const term = processTerm(token);
    if (term) terms.push(term);
  }
  return terms;
}

export function searchKey(text: string): string {
  return termsOf(text).join(" ");
}

function squashOf(terms: readonly string[]): string {
  return terms.join("");
}

function partsOf(terms: readonly string[]): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (let start = 0; start < terms.length; start += 1) {
    let acc = "";
    for (let end = start; end < terms.length; end += 1) {
      acc += terms[end];
      if (seen.has(acc)) continue;
      seen.add(acc);
      parts.push(acc);
    }
  }
  return parts.join(" ");
}

/** Edit distance allowed for a query term. 1–3 character terms stay exact. */
export function fuzzyDistance(term: string): number | false {
  if (term.length <= 3) return false;
  if (term.length <= 5) return 1;
  return 2;
}

type Source = "catalogue" | "custom" | "extra";
type Bucket = 0 | 1 | 2 | 3;

type Doc = {
  id: string;
  name: string;
  parts: string;
  source: Source;
};

type Hit = {
  name: string;
  source: Source;
  bucket: Bucket;
  key: string;
};

const SOURCE_RANK: Record<Source, number> = { catalogue: 0, custom: 1, extra: 2 };

function createIndex(): MiniSearch<Doc> {
  return new MiniSearch<Doc>({
    fields: ["name", "parts"],
    storeFields: ["name", "source"],
    tokenize,
    processTerm,
  });
}

function toDoc(id: string, name: string, source: Source): Doc | null {
  const terms = termsOf(name);
  if (terms.length === 0) return null;
  return { id, name, parts: partsOf(terms), source };
}

const catalogueIndex = createIndex();
const catalogueKeys = new Set<string>();
const catalogueDocs: Doc[] = [];
for (const exercise of EXERCISE_CATALOGUE) {
  const key = searchKey(exercise.name);
  if (!key || catalogueKeys.has(key)) continue;
  const doc = toDoc(exercise.id, exercise.name, "catalogue");
  if (!doc) continue;
  catalogueKeys.add(key);
  catalogueDocs.push(doc);
}
catalogueIndex.addAll(catalogueDocs);

let customIndex = createIndex();
let customStamp: string | null = null;
const customKeys = new Set<string>();

function indexedKeys(): Set<string> {
  const keys = new Set(catalogueKeys);
  for (const key of customKeys) keys.add(key);
  return keys;
}

function ensureCustom(names: readonly string[]): void {
  const stamp = names.map((name) => name.trim()).join("\n");
  if (stamp === customStamp) return;
  customStamp = stamp;
  customIndex = createIndex();
  customKeys.clear();
  const docs: Doc[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = searchKey(name);
    if (!key || seen.has(key) || catalogueKeys.has(key)) continue;
    const doc = toDoc(`custom:${key}`, name, "custom");
    if (!doc) continue;
    seen.add(key);
    customKeys.add(key);
    docs.push(doc);
  }
  if (docs.length > 0) customIndex.addAll(docs);
}

function storedCustomNames(): string[] {
  try {
    return loadCustomExercises().map((item) => item.name);
  } catch {
    return [];
  }
}

function allowPrefix(term: string, _index: number, terms: string[]): boolean {
  // A lone first letter still prefixes. Inside a longer query, "t" stays the whole token.
  return term.length >= 2 || terms.length === 1;
}

const wordSearch = {
  fields: ["name"],
  combineWith: "AND" as const,
  prefix: allowPrefix,
  fuzzy: (term: string) => fuzzyDistance(term),
};

const squashSearch = {
  fields: ["parts"],
  combineWith: "AND" as const,
  prefix: true,
  fuzzy: false as const,
};

function tokenMatches(queryTerm: string, nameTerm: string, solo: boolean): boolean {
  if (!solo && queryTerm.length <= 1) return nameTerm === queryTerm;
  return nameTerm.startsWith(queryTerm);
}

function allWords(queryTerms: readonly string[], nameTerms: readonly string[]): boolean {
  const solo = queryTerms.length === 1;
  return queryTerms.every((queryTerm) => nameTerms.some((nameTerm) => tokenMatches(queryTerm, nameTerm, solo)));
}

/** Squashed query is a prefix of one or more consecutive name tokens. */
function squashBoundary(querySquash: string, nameTerms: readonly string[]): boolean {
  if (!querySquash) return false;
  for (let start = 0; start < nameTerms.length; start += 1) {
    let acc = "";
    for (let end = start; end < nameTerms.length; end += 1) {
      acc += nameTerms[end];
      if (acc.length < querySquash.length) {
        if (!querySquash.startsWith(acc)) break;
        continue;
      }
      if (querySquash.length <= 1) {
        if (acc === querySquash) return true;
        break;
      }
      if (acc.startsWith(querySquash)) return true;
      break;
    }
  }
  return false;
}

function sharedPrefix(left: string, right: string): number {
  const limit = Math.min(left.length, right.length);
  let count = 0;
  while (count < limit && left.charCodeAt(count) === right.charCodeAt(count)) count += 1;
  return count;
}

function levenshtein(left: string, right: string, max: number): number | null {
  if (Math.abs(left.length - right.length) > max) return null;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const next = [row];
    let best = row;
    for (let col = 1; col <= right.length; col += 1) {
      const cost = left.charCodeAt(row - 1) === right.charCodeAt(col - 1) ? 0 : 1;
      const value = Math.min(previous[col] + 1, next[col - 1] + 1, previous[col - 1] + cost);
      next.push(value);
      if (value < best) best = value;
    }
    if (best > max) return null;
    previous = next;
  }
  return previous[right.length] <= max ? previous[right.length] : null;
}

function fuzzyTerm(queryTerm: string, nameTerm: string): boolean {
  const allowed = fuzzyDistance(queryTerm);
  if (allowed === false) return false;
  if (queryTerm[0] !== nameTerm[0]) return false;
  if (sharedPrefix(queryTerm, nameTerm) < 2) return false;
  const distance = levenshtein(queryTerm, nameTerm, allowed);
  return distance != null && distance > 0 && distance <= allowed;
}

function classify(name: string, queryTerms: readonly string[]): Bucket | null {
  const nameTerms = termsOf(name);
  if (nameTerms.length === 0 || queryTerms.length === 0) return null;
  const namePhrase = nameTerms.join(" ");
  const queryPhrase = queryTerms.join(" ");
  const nameSquash = squashOf(nameTerms);
  const querySquash = squashOf(queryTerms);

  if (namePhrase === queryPhrase || nameSquash === querySquash) return 0;
  if (namePhrase.startsWith(queryPhrase) || nameSquash.startsWith(querySquash)) return 1;
  if (allWords(queryTerms, nameTerms) || squashBoundary(querySquash, nameTerms)) return 2;
  const solo = queryTerms.length === 1;
  const explained = queryTerms.every((queryTerm) =>
    nameTerms.some((nameTerm) => tokenMatches(queryTerm, nameTerm, solo) || fuzzyTerm(queryTerm, nameTerm)),
  );
  return explained ? 3 : null;
}

function prefer(current: Hit, incoming: Hit): Hit {
  const bucket = Math.min(current.bucket, incoming.bucket) as Bucket;
  const primary = SOURCE_RANK[current.source] <= SOURCE_RANK[incoming.source] ? current : incoming;
  return { ...primary, bucket };
}

function collect(index: MiniSearch<Doc>, query: string, squash: string, queryTerms: readonly string[], into: Map<string, Hit>): void {
  const batches = [index.search(query, wordSearch)];
  if (squash) batches.push(index.search(squash, squashSearch));
  for (const batch of batches) {
    for (const result of batch) {
      const name = String(result.name ?? "");
      const key = searchKey(name);
      if (!key) continue;
      const bucket = classify(name, queryTerms);
      if (bucket == null) continue;
      const hit: Hit = {
        name,
        source: result.source as Source,
        bucket,
        key,
      };
      const previous = into.get(key);
      into.set(key, previous ? prefer(previous, hit) : hit);
    }
  }
}

export interface NameSearchOptions {
  /** Only these names may be returned. Names outside the standing indexes are searched too. */
  universe?: readonly string[];
  /** Extra names merged with the catalogue and custom indexes. Ignored when universe is set. */
  extraNames?: readonly string[];
  /** Custom exercises to index. Omit to read the ones saved in this browser. */
  customNames?: readonly string[];
  limit?: number;
}

function extraDocs(names: readonly string[], blocked: ReadonlySet<string>): Doc[] {
  const docs: Doc[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = searchKey(name);
    if (!key || seen.has(key) || blocked.has(key)) continue;
    const doc = toDoc(`extra:${key}`, name, "extra");
    if (!doc) continue;
    seen.add(key);
    docs.push(doc);
  }
  return docs;
}

/** Ranked exercise names for a name query. Empty when the query has no letters or digits. */
export function searchByName(query: string, options: NameSearchOptions = {}): string[] {
  const queryTerms = termsOf(query);
  if (queryTerms.length === 0) return [];
  const customNames = options.customNames ?? storedCustomNames();
  ensureCustom(customNames);

  const hits = new Map<string, Hit>();
  const squash = squashOf(queryTerms);
  collect(catalogueIndex, query, squash, queryTerms, hits);
  collect(customIndex, query, squash, queryTerms, hits);

  const pool = options.universe ?? options.extraNames;
  if (pool && pool.length > 0) {
    const docs = extraDocs(pool, indexedKeys());
    if (docs.length > 0) {
      const extraIndex = createIndex();
      extraIndex.addAll(docs);
      collect(extraIndex, query, squash, queryTerms, hits);
    }
  }

  let ranked = [...hits.values()];
  if (options.universe) {
    const allowed = new Map<string, string>();
    for (const name of options.universe) {
      const key = searchKey(name);
      if (!key || allowed.has(key)) continue;
      allowed.set(key, name.trim());
    }
    ranked = ranked.flatMap((hit) => {
      const name = allowed.get(hit.key);
      return name ? [{ ...hit, name }] : [];
    });
  }

  ranked.sort((a, b) => a.bucket - b.bucket || a.name.length - b.name.length || a.name.localeCompare(b.name));
  const names = ranked.map((hit) => hit.name);
  return options.limit != null && options.limit >= 0 ? names.slice(0, options.limit) : names;
}
