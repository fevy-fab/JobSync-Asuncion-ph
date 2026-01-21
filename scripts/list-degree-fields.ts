// scripts/list-degree-fields.ts
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface DegreeYamlEntry {
  key?: string;
  canonical?: string;
  level?: string;
  field_group?: string;
  fieldGroup?: string;
  aliases?: string[];
}

/**
 * Same extraction logic as in scoringAlgorithms.ts
 * so we are consistent.
 */
function extractDegreeField(degree: string): string {
  const inMatch = degree.match(/\bin\s+(.+)$/i);
  if (inMatch) return inMatch[1].trim();

  const ofMatch = degree.match(/\bof\s+(.+)$/i);
  if (ofMatch) return ofMatch[1].trim();

  return degree.trim();
}

/**
 * Parse degrees.yaml in both possible formats:
 * - degrees: { BS_ACC: { canonical: ..., ... }, ... }
 * - or top-level map/list
 */
function parseDegreesYaml(doc: any): DegreeYamlEntry[] {
  if (!doc) return [];
  const source = (doc as any).degrees ?? doc;

  const result: DegreeYamlEntry[] = [];

  // Array format
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item) continue;
      result.push(item as DegreeYamlEntry);
    }
    return result;
  }

  // Map format
  if (typeof source === 'object') {
    for (const [rawKey, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as DegreeYamlEntry;
      if (!v.key) v.key = String(rawKey);
      result.push(v);
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

  if (!fs.existsSync(degreesPath)) {
    console.error('❌ degrees.yaml not found at', degreesPath);
    process.exit(1);
  }

  const raw = await fs.promises.readFile(degreesPath, 'utf8');
  const doc = yaml.load(raw);
  const degrees = parseDegreesYaml(doc);

  type FieldInfo = {
    codes: string[];
    sampleCanonical: string;
    levels: Set<string>;
    fieldGroups: Set<string>;
  };

  const fields = new Map<string, FieldInfo>();

  degrees.forEach((d, idx) => {
    const canonical = (d.canonical || '').toString().trim();
    const key = (d.key || `index_${idx}`).toString();
    const level = (d.level || '').toString().trim();
    const fg = (d.field_group || d.fieldGroup || '').toString().trim();

    if (!canonical) return;

    const field = extractDegreeField(canonical);

    if (!fields.has(field)) {
      fields.set(field, {
        codes: [key],
        sampleCanonical: canonical,
        levels: new Set(level ? [level] : []),
        fieldGroups: new Set(fg ? [fg] : []),
      });
    } else {
      const info = fields.get(field)!;
      info.codes.push(key);
      if (level) info.levels.add(level);
      if (fg) info.fieldGroups.add(fg);
    }
  });

  // Ensure output folder exists
  const outDir = path.join(root, 'scripts', 'outputs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const txtPath = path.join(outDir, 'degree-fields.txt');
  const jsonPath = path.join(outDir, 'degree-fields.json');

  // Build human-readable TXT
  const lines: string[] = [];

  lines.push('======================================');
  lines.push(' Unique degree fields from degrees.yaml');
  lines.push('======================================');
  lines.push('');
  lines.push(`Total unique fields: ${fields.size}`);
  lines.push('');

  Array.from(fields.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([field, info]) => {
      lines.push(`Field: ${field}`);
      lines.push(`  Sample canonical: ${info.sampleCanonical}`);
      lines.push(`  Codes: ${info.codes.join(', ')}`);
      lines.push(
        `  Levels: ${
          info.levels.size ? Array.from(info.levels).join(', ') : '(none)'
        }`
      );
      lines.push(
        `  Existing field_group(s): ${
          info.fieldGroups.size ? Array.from(info.fieldGroups).join(', ') : '(none)'
        }`
      );
      lines.push('');
    });

  await fs.promises.writeFile(txtPath, lines.join('\n'), 'utf8');

  // Build JSON for machine use / me
  const jsonFriendly = Array.from(fields.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([field, info]) => ({
      field,
      sampleCanonical: info.sampleCanonical,
      codes: info.codes,
      levels: Array.from(info.levels),
      fieldGroups: Array.from(info.fieldGroups),
    }));

  await fs.promises.writeFile(jsonPath, JSON.stringify(jsonFriendly, null, 2), 'utf8');

  console.log('✅ Degree field dump created.');
  console.log('TXT :', txtPath);
  console.log('JSON:', jsonPath);
  console.log('');
  console.log('You can:');
  console.log(' - Open the TXT/JSON in an editor locally;');
  console.log(' - Or upload degree-fields.json here so I can design fieldGroup mappings for you.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
