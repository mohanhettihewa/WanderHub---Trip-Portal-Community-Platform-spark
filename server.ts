/**
 * WanderHub - Full-Stack Server & Python FastAPI Microservices Proxy
 * 
 * Launches the live Python 3 FastAPI Microservices Gateway (backend/gateway.py)
 * on port 8000 and proxies all /api/v1/* requests from Express (port 3000)
 * directly to the Python backend.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';

const PORT = 3000;
const PYTHON_PORT = 8000;

let pythonProcess: ChildProcess | null = null;

function startPythonBackend(): Promise<void> {
  return new Promise((resolve) => {
    const gatewayPath = path.resolve(process.cwd(), 'backend', 'gateway.py');
    pythonProcess = spawn('python3', [gatewayPath], {
      env: { ...process.env, PYTHON_PORT: String(PYTHON_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const markReady = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      if (text.includes('Listening on')) {
        markReady();
      }
    });

    pythonProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[Python Backend]', data.toString().trim());
    });

    pythonProcess.on('exit', (code) => {
      console.warn(`[Python Backend] Exited with code ${code}. Restarting in 1s...`);
      setTimeout(() => {
        startPythonBackend();
      }, 1000);
    });

    // Fallback timeout in case stdout is buffered
    setTimeout(markReady, 800);
  });
}

async function startServer() {
  await startPythonBackend();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Proxy all /api/v1/* requests to the live Python 3 FastAPI Microservices Gateway
  app.use('/api/v1', (req, res) => {
    const bodyData = req.method !== 'GET' && req.method !== 'HEAD' && req.body
      ? JSON.stringify(req.body)
      : '';

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: PYTHON_PORT,
      path: `/api/v1${req.url}`,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyData ? { 'Content-Length': Buffer.byteLength(bodyData) } : {}),
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || 200);
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      });
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.status(502).json({
        detail: `Python FastAPI Gateway unavailable: ${err.message}`,
      });
    });

    if (bodyData) {
      proxyReq.write(bodyData);
    }
    proxyReq.end();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WanderHub Server] Running on http://0.0.0.0:${PORT} (Proxying /api/v1/* -> Python FastAPI :${PYTHON_PORT})`);
  });
}

startServer();
