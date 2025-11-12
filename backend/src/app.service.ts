import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  getRoot(): { message: string; version: string } {
    return {
      message: 'Idea Communicator API',
      version: '0.1.0',
    };
  }

  getHealth(): {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
  } {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
