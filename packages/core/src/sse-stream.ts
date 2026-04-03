import type { ServerResponse } from 'node:http';
import type { NextDogEvent } from './types.js';
import type { RingBuffer } from './ring-buffer.js';

function serializeEvent(event: NextDogEvent): string {
  const json = JSON.stringify(event, (_key, value) =>
    typeof value === 'bigint' ? value.toString() + 'n' : value
  );
  return `data: ${json}\n\n`;
}

export class SSEStream {
  private clients = new Set<ServerResponse>();

  constructor(private ringBuffer: RingBuffer) {}

  get clientCount(): number {
    return this.clients.size;
  }

  addClient(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Backfill from ring buffer (200 events covers typical page load)
    const backfill = this.ringBuffer.getLast(200);
    for (const event of backfill) {
      res.write(serializeEvent(event));
    }

    this.clients.add(res);
  }

  removeClient(res: ServerResponse): void {
    this.clients.delete(res);
  }

  broadcast(event: NextDogEvent): void {
    const message = serializeEvent(event);
    for (const client of this.clients) {
      client.write(message);
    }
  }
}
