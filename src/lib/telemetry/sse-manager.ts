const SHARED_ENCODER = new TextEncoder();
const KEEPALIVE_BYTES = SHARED_ENCODER.encode(":keepalive\n\n");

interface SseClient {
  controller: ReadableStreamDefaultController;
}

export class SseManager {
  private clients = new Set<SseClient>();
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  addClient(controller: ReadableStreamDefaultController): () => void {
    const client: SseClient = { controller };
    this.clients.add(client);
    this.ensureKeepalive();

    return () => {
      this.clients.delete(client);
      if (this.clients.size === 0 && this.keepaliveTimer !== null) {
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = null;
      }
    };
  }

  broadcast(event: string, data: unknown): void {
    const encoded = SHARED_ENCODER.encode(SseManager.encodeEvent(event, data));
    const failed: SseClient[] = [];

    for (const client of this.clients) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        failed.push(client);
      }
    }

    for (const client of failed) {
      this.clients.delete(client);
    }

    if (this.clients.size === 0 && this.keepaliveTimer !== null) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  static encodeEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  static encodeKeepAlive(): Uint8Array {
    return KEEPALIVE_BYTES;
  }

  private ensureKeepalive(): void {
    if (this.keepaliveTimer !== null) return;

    this.keepaliveTimer = setInterval(() => {
      const failed: SseClient[] = [];

      for (const client of this.clients) {
        try {
          client.controller.enqueue(KEEPALIVE_BYTES);
        } catch {
          failed.push(client);
        }
      }

      for (const client of failed) {
        this.clients.delete(client);
      }

      if (this.clients.size === 0 && this.keepaliveTimer !== null) {
        clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = null;
      }
    }, 30_000);
  }
}
