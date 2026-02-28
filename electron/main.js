const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const DEFAULT_PORT = Number.parseInt(process.env.URBAN_DDS_PORT ?? process.env.PORT ?? '3000', 10);
const HOST = '127.0.0.1';

let mainWindow = null;
let serverProcess = null;
let selectedPort = DEFAULT_PORT;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();
    tester.on('error', () => resolve(false));
    tester.listen(port, HOST, () => {
      tester.close(() => {
        resolve(true);
      });
    });
  });

const resolveAppRoot = () => {
  const candidates = [
    path.join(__dirname, '..'),
    path.join(process.resourcesPath ?? '', 'app'),
    app.getAppPath(),
  ];

  for (const root of candidates) {
    if (!root) {
      continue;
    }
    const normalizedRoot = path.resolve(root);
    const serverPath = path.join(normalizedRoot, '.next', 'standalone', 'server.js');
    const staticPath = path.join(normalizedRoot, '.next', 'standalone');
    if (fs.existsSync(serverPath) && fs.existsSync(staticPath)) {
      return normalizedRoot;
    }
  }

  return null;
};

const resolveServerPort = async () => {
  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 24; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available port found for embedded Urban-DDS server');
};

const checkHealth = (port) =>
  new Promise((resolve) => {
    const req = http.get(
      `http://${HOST}:${port}/api/health`,
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );

    req.setTimeout(800, () => {
      req.destroy(new Error('Health check timeout'));
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });
  });

const waitForServer = async (port, maxAttempts = 120, delayMs = 250) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await checkHealth(port)) {
      return;
    }
    await wait(delayMs);
  }
  throw new Error('Embedded server did not start in time');
};

const startEmbeddedServer = async () => {
  const appRoot = resolveAppRoot();
  if (!appRoot) {
    throw new Error('Unable to locate bundled Next.js standalone server');
  }

  const serverPath = path.join(appRoot, '.next', 'standalone', 'server.js');
  selectedPort = await resolveServerPort();

  const nextEnv = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: String(selectedPort),
    URBAN_DDS_PORT: String(selectedPort),
    HOSTNAME: HOST,
  };

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: appRoot,
    env: nextEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    console.log(`[urban-ds] ${chunk.toString().trim()}`);
  });
  serverProcess.stderr.on('data', (chunk) => {
    console.error(`[urban-ds] ${chunk.toString().trim()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Embedded server exited with code ${code}`);
  });

  serverProcess.on('error', (error) => {
    throw error;
  });

  await waitForServer(selectedPort);
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Urban-DDS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://${HOST}:${selectedPort}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const stopEmbeddedServer = () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
};

app.whenReady().then(async () => {
  try {
    await startEmbeddedServer();
    createMainWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  stopEmbeddedServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
