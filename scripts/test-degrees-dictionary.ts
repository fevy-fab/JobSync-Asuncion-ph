// scripts/test-degrees-dictionary.ts
//
// Run with:
//   npx ts-node scripts/test-degrees-dictionary.ts

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
 * Same logic as parseDegreesYaml() in src/lib/gemini/normalization.ts
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

  console.log('▶ JobSync degrees.yaml debug');
  console.log('process.cwd() =', root);
  console.log('degreesPath   =', degreesPath);

  if (!fs.existsSync(degreesPath)) {
    console.error('❌ degrees.yaml NOT FOUND at this path.');
    process.exit(1);
  }

  // Read raw file to check physical line count
  const raw = await fs.promises.readFile(degreesPath, 'utf8');
  const lineCount = raw.split(/\r?\n/).length;
  console.log('----------------------------------------');
  console.log('Physical line count in degrees.yaml:', lineCount);

  // Parse YAML using same logic as normalization.ts
  let doc: any;
  try {
    doc = yaml.load(raw);
  } catch (err) {
    console.error('❌ Failed to parse YAML:', err);
    process.exit(1);
  }

  const degreesList = parseDegreesYaml(doc);
  console.log('Parsed degree entries:', degreesList.length);

  // Count level distribution
  const levelCounts = new Map<string, number>();
  for (const d of degreesList) {
    const rawLevel =
      typeof d.level === 'string'
        ? d.level
        : d.level != null
        ? String(d.level)
        : '';
    const level = rawLevel.toLowerCase().trim() || 'UNSPECIFIED';

    levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
  }

  console.log('----------------------------------------');
  console.log('Degree "level" distribution:');
  for (const [level, count] of levelCounts.entries()) {
    console.log(`  - ${level}: ${count}`);
  }

  console.log('----------------------------------------');
  console.log('Sample entries (first 5):');
  degreesList.slice(0, 5).forEach((d, idx) => {
    console.log(`  #${idx + 1}`, {
      key: d.key,
      canonical: d.canonical,
      level: d.level,
      fieldGroup: d.fieldGroup,
      aliasesCount: d.aliases.length,
    });
  });

  console.log('✅ Done.');
}

main().catch(err => {
  console.error('Unexpected error in test-degrees-dictionary:', err);
  process.exit(1);
});
