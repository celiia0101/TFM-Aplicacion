// Levanta los 3 servicios de Adaptive Pomodoro en paralelo:
// backend (Node/Express, :4000), API de ML (FastAPI, :8000) y frontend (Expo, :8081).
// Usamos spawn con cwd/paths absolutos en vez de comandos de shell con "cd && ..",
// porque en Windows cmd.exe no resuelve bien las rutas relativas con "../".

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const isWin = process.platform === 'win32';

const venvPython = path.join(ROOT, '.venv', 'Scripts', isWin ? 'python.exe' : path.join('..', 'bin', 'python'));
const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python';

const services = [
  {
    name: 'BACKEND',
    color: '34', // azul
    cmd: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(ROOT, 'src', 'backend'),
    shell: isWin,
  },
  {
    name: 'API',
    color: '33', // amarillo
    cmd: pythonBin,
    args: ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'],
    cwd: path.join(ROOT, 'src', 'API'),
    shell: false,
  },
  {
    name: 'FRONTEND',
    color: '32', // verde
    cmd: 'npm',
    args: ['run', 'start'],
    cwd: path.join(ROOT, 'src', 'frontend', 'AdaptivePomodoroApp'),
    shell: isWin,
    // Expo CLI solo dibuja el QR y el menú interactivo (w/a/i, r, etc.) si
    // detecta una terminal real (stdout.isTTY). Con stdio:'pipe' (para poder
    // colorear el log) Expo ve una tubería, no una TTY, y se calla. Le damos
    // acceso directo a la terminal a costa de perder el prefijo de color.
    interactive: true,
  },
];

function prefixLines(data, prefix) {
  return data
    .toString()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `${prefix} ${line}`)
    .join('\n') + '\n';
}

const children = services.map((svc) => {
  const prefix = `\x1b[${svc.color}m[${svc.name}]\x1b[0m`;

  if (!fs.existsSync(svc.cwd)) {
    console.error(`${prefix} directorio no encontrado: ${svc.cwd}`);
    return null;
  }

  const stdio = svc.interactive ? 'inherit' : 'pipe';

  // Con shell:true, Node espera una única cadena de comando (no un array de
  // args) para no arrastrar el aviso de deprecación DEP0190 sobre argumentos
  // sin escapar. Como aquí los argumentos son fijos (no vienen de fuera), es seguro.
  const child = svc.shell
    ? spawn([svc.cmd, ...svc.args].join(' '), { cwd: svc.cwd, shell: true, stdio })
    : spawn(svc.cmd, svc.args, { cwd: svc.cwd, shell: false, stdio });

  if (!svc.interactive) {
    child.stdout.on('data', (d) => process.stdout.write(prefixLines(d, prefix)));
    child.stderr.on('data', (d) => process.stderr.write(prefixLines(d, prefix)));
  }
  child.on('exit', (code) => console.log(`${prefix} terminó con código ${code}`));
  child.on('error', (err) => console.error(`${prefix} error al arrancar: ${err.message}`));

  return child;
});

function killTree(child) {
  if (!child || !child.pid) return;
  if (isWin) {
    // child.kill() en Windows no mata subprocesos (p.ej. el worker que
    // levanta "uvicorn --reload"), así que hay que matar el árbol entero.
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill();
  }
}

function shutdown() {
  for (const child of children) {
    killTree(child);
  }
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
