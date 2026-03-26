// ============================================
// PVS Mock Server
// ============================================

import { createServer, Server } from 'http';
import type { RequestListener } from 'http';

export class PvsMockServer {
  private server: Server | null = null;
  private requests: any[] = [];

  constructor(private port: number = 9999) {}

  start(): Promise<void> {
    return new Promise((resolve) => {
      const handler: RequestListener = (req, res) => {
        this.requests.push({ method: req.method, url: req.url, timestamp: new Date() });
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ status: 'ok' }));
      };

      this.server = createServer(handler);
      this.server.listen(this.port, () => resolve());
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  getRequests(): any[] {
    return [...this.requests];
  }
}

export const createMockServer = (port?: number) => new PvsMockServer(port);
