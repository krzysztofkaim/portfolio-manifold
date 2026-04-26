import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCloudflareHeadersFile } from '../config/securityHeaders.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const outputPath = path.join(repoRoot, 'public', '_headers');

await writeFile(outputPath, renderCloudflareHeadersFile(), 'utf8');
console.log(`Synced ${path.relative(repoRoot, outputPath)}`);
