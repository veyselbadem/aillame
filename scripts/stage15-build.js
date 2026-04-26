const { execSync } = require('child_process');
const path = require('path');
const cwd = path.resolve('c:/Users/veyse/OneDrive/Desktop/çalışmalar/aillame');
try {
  execSync('node_modules\\.bin\\tsc.cmd --noEmit', { cwd, stdio: 'inherit' });
  console.log('TSC_OK');
  execSync('npm.cmd run build', { cwd, stdio: 'inherit' });
  console.log('BUILD_OK');
  process.exit(0);
} catch (error) {
  console.error('BUILD_FAILED');
  if (error.stdout) console.error('STDOUT:', error.stdout.toString());
  if (error.stderr) console.error('STDERR:', error.stderr.toString());
  process.exit(1);
}
