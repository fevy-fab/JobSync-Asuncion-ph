// scripts/check-degrees-alias-duplicates.ts
//
// Run with:
//   npx ts-node scripts/check-degrees-alias-duplicates.ts

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface CanonicalDegree {
  key: string;
  canonical: string;
  level?: string;
  fieldGroup?: string;
  aliases: string[];
}

/**
 * Must match the logic in src/lib/gemini/normalization.ts (parseDegreesYaml)
 */
function parseDegreesYaml(doc: any): CanonicalDegree[] {
  if (!doc) return [];

  const source = doc.degrees ?? doc; // support { degrees: {...} } or top-level map
  const result: CanonicalDegree[] = [];

  // Format B: degrees is an array
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      const key = (item as any).key || (item as any).id;
      if (!key || !(item as any).canonical) continue;

      result.push({
        key: String(key),
        canonical: String((item as any).canonical),
        level: (item as any).level,
        fieldGroup: (item as any).field_group || (item as any).fieldGroup,
        aliases: Array.isArray((item as any).aliases)
          ? (item as any).aliases.map((a: any) => String(a))
          : [],
      });
    }
    return result;
  }

  // Format A/C: object map
  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v: any = value;
      const key = v.key || rawKey;
      const canonical = v.canonical;
      if (!key || !canonical) continue;

      const aliases: string[] = Array.isArray(v.aliases)
        ? v.aliases.map((a: any) => String(a))
        : [];

      result.push({
        key: String(key),
        canonical: String(canonical),
        level: v.level,
        fieldGroup: v.field_group || v.fieldGroup,
        aliases,
      });
    }
    return result;
  }

  return [];
}

/**
 * Must match normalizeKey() in normalization.ts
 * - lowercase
 * - strip punctuation
 * - collapse whitespace
 */
function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // remove punctuation
    .replace(/\s+/g, ' '); // collapse spaces
}

type AliasUsageEntry = {
  degreeKey: string;
  canonical: string;
  raw: string; // raw string before normalization
};

async function main() {
  const root = process.cwd();
  const degreesPath = path.join(
    root,
    'src',
    'app',
    'config',
    'dictionaries',
    'degrees.yaml'
  );

  console.log('▶ Checking degrees.yaml alias duplication');
  console.log('process.cwd() =', root);
  console.log('degreesPath   =', degreesPath);

  if (!fs.existsSync(degreesPath)) {
    console.error('❌ degrees.yaml NOT FOUND at this path.');
    process.exit(1);
  }

  const raw = await fs.promises.readFile(degreesPath, 'utf8');

  // Parse YAML
  let doc: any;
  try {
    doc = yaml.load(raw);
  } catch (err) {
    console.error('❌ Failed to parse YAML:', err);
    process.exit(1);
  }

  const degreesList = parseDegreesYaml(doc);
  console.log('----------------------------------------');
  console.log('Total degree entries:', degreesList.length);

  if (degreesList.length === 0) {
    console.error('❌ No degree entries found. Check degrees.yaml structure.');
    process.exit(1);
  }

  // Build alias usage map (normalized alias -> list of usages)
  const aliasMap = new Map<string, AliasUsageEntry[]>();

  for (const degree of degreesList) {
    const usedStrings = new Set<string>();
    usedStrings.add(degree.canonical);
    degree.aliases.forEach(a => usedStrings.add(a));

    for (const s of usedStrings) {
      const nk = normalizeKey(s);
      if (!nk) continue;

      const list = aliasMap.get(nk) ?? [];
      list.push({
        degreeKey: degree.key,
        canonical: degree.canonical,
        raw: s,
      });
      aliasMap.set(nk, list);
    }
  }

  const totalNormalizedAliases = aliasMap.size;

  // Find duplicates: normalized alias used by more than one degree key
  const duplicates: Array<[string, AliasUsageEntry[]]> = [];
  for (const [nk, entries] of aliasMap.entries()) {
    const uniqueDegreeKeys = new Set(entries.map(e => e.degreeKey));
    if (uniqueDegreeKeys.size > 1) {
      duplicates.push([nk, entries]);
    }
  }

  console.log('----------------------------------------');
  console.log('Alias statistics:');
  console.log('  Total normalized alias strings:', totalNormalizedAliases);
  console.log('  Aliases shared by multiple degrees:', duplicates.length);

  if (duplicates.length > 0) {
    console.log('\nDuplicate aliases (normalized → degrees):');
    console.log('----------------------------------------');

    duplicates.forEach(([nk, entries]) => {
      // unique degreeKey → canonical
      const degreeMap = new Map<string, string>();
      entries.forEach(e => {
        if (!degreeMap.has(e.degreeKey)) {
          degreeMap.set(e.degreeKey, e.canonical);
        }
      });

      const uniqueRawStrings = Array.from(
        new Set(entries.map(e => e.raw))
      );

      console.log(`- "${nk}"`);
      console.log(
        `  degrees: ${Array.from(degreeMap.entries())
          .map(([key, canonical]) => `[${key}] ${canonical}`)
          .join(' | ')}`
      );
      console.log(
        `  raw variants: ${uniqueRawStrings.map(r => JSON.stringify(r)).join(', ')}`
      );
      console.log('----------------------------------------');
    });
  } else {
    console.log('\n✅ No duplicate aliases detected. Each normalized alias maps to a single degree key.');
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Unexpected error in check-degrees-alias-duplicates:', err);
  process.exit(1);
});
