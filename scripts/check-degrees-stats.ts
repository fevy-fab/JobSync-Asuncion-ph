// scripts/check-degrees-stats.ts
//
// Run with:
//   npx ts-node scripts/check-degrees-stats.ts

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

  console.log('▶ Degrees YAML statistics');
  console.log('process.cwd() =', root);
  console.log('degreesPath   =', degreesPath);

  if (!fs.existsSync(degreesPath)) {
    console.error('❌ degrees.yaml NOT FOUND at this path.');
    process.exit(1);
  }

  const raw = await fs.promises.readFile(degreesPath, 'utf8');

  // Count YAML lines
  const lineCount = raw.split(/\r?\n/).length;

  // Parse YAML
  let doc: any;
  try {
    doc = yaml.load(raw);
  } catch (err) {
    console.error('❌ Failed to parse YAML:', err);
    process.exit(1);
  }

  const degreesList = parseDegreesYaml(doc);

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
  let totalDuplicateUsages = 0;

  for (const [nk, entries] of aliasMap.entries()) {
    const uniqueDegreeKeys = new Set(entries.map(e => e.degreeKey));
    if (uniqueDegreeKeys.size > 1) {
      duplicates.push([nk, entries]);
      totalDuplicateUsages += entries.length;
    }
  }

  console.log('----------------------------------------');
  console.log('YAML file:');
  console.log('  Line count:', lineCount);
  console.log('----------------------------------------');
  console.log('Degree entries:');
  console.log('  Total degrees:', degreesList.length);
  console.log('----------------------------------------');
  console.log('Alias statistics:');
  console.log('  Total normalized alias strings:', totalNormalizedAliases);
  console.log(
    '  Distinct normalized aliases shared by multiple degrees:',
    duplicates.length
  );
  console.log(
    '  Total duplicate usages involved in conflicts:',
    totalDuplicateUsages
  );
  console.log('----------------------------------------');
  console.log('Done.');
}

main().catch(err => {
  console.error('Unexpected error in check-degrees-stats:', err);
  process.exit(1);
});
