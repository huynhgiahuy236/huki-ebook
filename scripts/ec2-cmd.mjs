import { spawn } from 'child_process';

const cmd = process.argv.slice(2).join(' ') || 'hostname';
const remoteScript = `
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
${cmd}
`;

const proc = spawn('ssh', [
  '-i', 'E:\\bookstore-aws-key.pem',
  '-o', 'StrictHostKeyChecking=no',
  'ubuntu@54.179.0.246',
  'bash -l'
], { stdio: ['pipe', 'inherit', 'inherit'] });

proc.stdin.write(remoteScript);
proc.stdin.end();
