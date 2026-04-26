import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const staleArtifacts = [
  path.join(repoRoot, 'public', '.DS_Store'),
  path.join(repoRoot, 'dist', '.DS_Store'),
  path.join(repoRoot, 'dist', 'bundle-stats.json'),
  path.join(repoRoot, 'dist', 'bundle-treemap.html')
];

for (const artifactPath of staleArtifacts) {
  try {
    await unlink(artifactPath);
    console.log(`Removed stale ${path.relative(repoRoot, artifactPath)}`);
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
}
