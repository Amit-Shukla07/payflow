import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
  check(req: Request, res: Response): void {
    const isDbConnected = mongoose.connection.readyState === 1;

    res.status(isDbConnected ? 200 : 503).json({
      success: isDbConnected,
      status: isDbConnected ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
      },
    });
  }
}

export const healthController = new HealthController();

