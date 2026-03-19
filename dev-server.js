const { spawn } = require('child_process');
const path = require('path');

const nodeDir = path.dirname(process.execPath);
const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next');
const port = process.env.PORT || '3000';

process.stdout.write('Starting Next.js dev server on port ' + port + '...\n');
process.stdout.write('Node: ' + process.execPath + '\n');

const child = spawn(nextBin, ['dev', '--webpack', '--port', port], {
  cwd: __dirname,
  stdio: 'inherit',
  env: Object.assign({}, process.env, {
    PATH: nodeDir + ':' + (process.env.PATH || '/usr/bin:/bin'),
    FORCE_COLOR: '0',
    NO_COLOR: '1',
    NEXT_TELEMETRY_DISABLED: '1',
    CI: '1',
  }),
});

child.on('error', function(err) {
  process.stderr.write('Error: ' + err.message + '\n');
  process.exit(1);
});
child.on('exit', function(code) { process.exit(code || 0); });
