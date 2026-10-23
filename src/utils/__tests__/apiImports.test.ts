import { describe, it, expect } from 'vitest';

declare const __dirname: string;
declare const require: any;

describe('API ESM relative imports test', () => {
  it('ensures every relative import in api/ (including api/_lib) has a .js extension', () => {
    const fs = require('fs');
    const path = require('path');

    const apiDir = path.resolve(__dirname, '../../../api');
    expect(fs.existsSync(apiDir)).toBe(true);

    function getAllFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getAllFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const allApiFiles = getAllFiles(apiDir);
    expect(allApiFiles.length).toBeGreaterThan(0);

    const relativeImportRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g;
    const failures: string[] = [];

    for (const filePath of allApiFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(apiDir, filePath);
      let match: RegExpExecArray | null;

      while ((match = relativeImportRegex.exec(content)) !== null) {
        const specifier = match[1];
        if (!specifier.endsWith('.js')) {
          failures.push(
            `File "api/${relPath}" has relative import "${specifier}" missing ".js" extension.`
          );
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(`Relative imports missing ".js" extension found:\n${failures.join('\n')}`);
    }

    expect(failures).toEqual([]);
  });
});
