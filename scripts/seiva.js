// scripts/seiva.js
import { fileURLToPath } from 'node:url';

// Garante compatibilidade cross-platform (Windows backslash fix)
process.argv[1] = fileURLToPath(import.meta.url).replace(/\\/g, '/') + '/seiva.js';
await import('@seiva-ai/cli/bin/seiva.js');
