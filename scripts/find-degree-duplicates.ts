// scripts/find-degree-duplicates.ts
import fs from 'fs';
import path from 'path';

function main() {
  const degreesPath = path.join(
    process.cwd(),
    'src',
    'app',
    'config',
    'dictionaries',
    'degrees.yaml'
  );

  console.log('[JobSync] Scanning for duplicate degree keys in:', degreesPath);

  const content = fs.readFileSync(degreesPath, 'utf8');
  const lines = content.split(/\r?\n/);

  const keyCounts = new Map<string, { count: number; lines: number[] }>();

  let insideDegrees = false;

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    if (!insideDegrees) {
      if (/^degrees:\s*$/.test(line)) {
        insideDegrees = true;
      }
      return;
    }

    // Stop if we hit another top-level key (no indentation)
    if (/^[A-Za-z0-9_]+:\s*$/.test(line)) {
      // new top-level section; we're past "degrees:"
      insideDegrees = false;
      return;
    }

    // Match 2-space-indented DEGREE_CODE:
    const match = /^ {2}([A-Z0-9_]+):\s*$/.exec(line);
    if (match) {
      const key = match[1];
      const entry = keyCounts.get(key) ?? { count: 0, lines: [] };
      entry.count += 1;
      entry.lines.push(lineNo);
      keyCounts.set(key, entry);
    }
  });

  const duplicates = Array.from(keyCounts.entries()).filter(
    ([, info]) => info.count > 1
  );

  if (duplicates.length === 0) {
    console.log('✅ No duplicate degree keys found inside "degrees:" section.');
    return;
  }

  console.log('❌ Found duplicate degree keys:\n');
  for (const [key, info] of duplicates) {
    console.log(
      `- ${key}: appears ${info.count} times on lines ${info.lines.join(', ')}`
    );
  }
}

main();
