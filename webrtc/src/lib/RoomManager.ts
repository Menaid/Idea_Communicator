import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { Room } from './Room';
import { logger } from './logger';

export class RoomManager {
  private rooms: Map<string, Room>;
  private workers: mediasoupTypes.Worker[];
  private nextWorkerIdx: number;

  constructor(workers: mediasoupTypes.Worker[]) {
    this.rooms = new Map();
    this.workers = workers;
    this.nextWorkerIdx = 0;
  }

  private getNextWorker(): mediasoupTypes.Worker {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  async getOrCreateRoom(
    roomId: string,
    mediaCodecs: mediasoupTypes.RtpCodecCapability[],
  ): Promise<Room> {
    let room = this.rooms.get(roomId);

    if (!room) {
      const worker = this.getNextWorker();
      const router = await worker.createRouter({ mediaCodecs });

      room = new Room(roomId, router);
      this.rooms.set(roomId, room);

      logger.info(`New room created: ${roomId} on worker ${worker.pid}`);
    }

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.close();
      this.rooms.delete(roomId);
      logger.info(`Room deleted: ${roomId}`);
    }
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getStats(): {
    totalRooms: number;
    totalPeers: number;
    rooms: Array<{
      id: string;
      peers: number;
    }>;
  } {
    const rooms = this.getRooms();
    const totalPeers = rooms.reduce((sum, room) => sum + room.peers.size, 0);

    return {
      totalRooms: rooms.length,
      totalPeers,
      rooms: rooms.map((room) => ({
        id: room.id,
        peers: room.peers.size,
      })),
    };
  }

  closeAll(): void {
    this.rooms.forEach((room) => room.close());
    this.rooms.clear();
    logger.info('All rooms closed');
  }
}
