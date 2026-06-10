import { execSync } from 'node:child_process';

const run = (command) => {
  execSync(command, { stdio: 'inherit' });
};

const isLinux = process.platform === 'linux';
const wantsWithDeps = process.argv.includes('--with-deps') || process.env.PW_INSTALL_DEPS === '1';
const command = isLinux && wantsWithDeps
  ? 'npx playwright install --with-deps chromium'
  : 'npx playwright install chromium';

console.log(`[e2e-setup] Platform detected: ${process.platform}`);
console.log(`[e2e-setup] Running: ${command}`);

try {
  run(command);
  if (isLinux && !wantsWithDeps) {
    console.log('[e2e-setup] Linux/WSL detected: this run installs browser only (non-interactive).');
    console.log('[e2e-setup] System libs must be provisioned separately (one-time) via:');
    console.log('[e2e-setup]   npx playwright install --with-deps chromium');
  }
  console.log('[e2e-setup] Playwright environment is ready.');
} catch (error) {
  console.error('[e2e-setup] Failed to prepare Playwright dependencies.');
  if (isLinux && !wantsWithDeps) {
    console.error('[e2e-setup] Linux/WSL may be missing native libraries (e.g. libnspr4.so).');
    console.error('[e2e-setup] Run once in provisioning stage with elevated permissions:');
    console.error('[e2e-setup]   npx playwright install --with-deps chromium');
  } else {
    console.error('[e2e-setup] If running on Linux/WSL, ensure command can install system packages (sudo/root).');
  }
  process.exit(1);
}
