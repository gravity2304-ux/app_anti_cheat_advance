/**
 * Telemetry Service: Event ingestion, Local queue, Exponential backoff, SendBeacon
 */

export interface ExamEvent {
  clientSeqNo: number;
  eventType: string;
  payload?: string;
  timestamp: string;
}

export class TelemetryService {
  private queue: ExamEvent[] = [];
  private resumeToken: string | null = null;
  private ws: WebSocket | null = null;
  private seqNo = 0;
  private backendUrl = 'http://localhost:3000/api/events';
  private wsUrl = 'ws://localhost:3000';
  private syncTimeout: any = null;
  private retryCount = 0;
  
  constructor() {
    this.resumeToken = localStorage.getItem('resumeToken');
    const savedQueue = localStorage.getItem('telemetryQueue');
    if (savedQueue) {
      try {
        this.queue = JSON.parse(savedQueue);
        // Find max seqNo to ensure ordering
        if (this.queue.length > 0) {
           this.seqNo = Math.max(...this.queue.map(q => q.clientSeqNo));
        }
      } catch(e) {}
    }

    this.setupVisibilityHandler();
    this.connectWs();
  }

  setToken(token: string) {
    this.resumeToken = token;
    localStorage.setItem('resumeToken', token);
  }

  logEvent(eventType: string, payload?: any) {
    this.seqNo++;
    const ev: ExamEvent = {
       clientSeqNo: this.seqNo,
       eventType,
       payload: payload ? JSON.stringify(payload) : undefined,
       timestamp: new Date().toISOString()
    };
    
    this.queue.push(ev);
    this.saveQueue();
    this.scheduleSync();
  }

  private saveQueue() {
    localStorage.setItem('telemetryQueue', JSON.stringify(this.queue));
  }

  private scheduleSync(delay = 1000) {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => this.syncEvents(), delay);
  }

  private async syncEvents() {
    if (this.queue.length === 0 || !this.resumeToken) return;

    const payload = {
        resumeToken: this.resumeToken,
        events: this.queue
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
            this.ws.send(JSON.stringify({ type: 'SYNC_EVENTS', payload }));
            this.handleSyncSuccess();
        } catch(e) {
            this.handleSyncFailure();
        }
    } else {
        // HTTP Fallback
        try {
            const res = await fetch(this.backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                this.handleSyncSuccess();
            } else {
                this.handleSyncFailure();
            }
        } catch (e) {
            this.handleSyncFailure();
        }
    }
  }

  private handleSyncSuccess() {
      this.retryCount = 0;
      this.queue = [];
      this.saveQueue();
  }

  private handleSyncFailure() {
      this.retryCount++;
      // Exponential backoff: 2s, 4s, 8s, up to 60s
      const delay = Math.min(Math.pow(2, this.retryCount) * 1000, 60000);
      this.scheduleSync(delay);
  }

  private connectWs() {
      try {
          this.ws = new WebSocket(this.wsUrl);
          this.ws.onopen = () => {
              this.retryCount = 0;
              if (this.queue.length > 0) this.scheduleSync(0);
          };
          this.ws.onmessage = (msg) => {
              try {
                  const data = JSON.parse(msg.data);
                  if (data.type === 'SYNC_ACK') {
                      // Optionally filter out acknowledged seqNos instead of clearing all
                      this.queue = this.queue.filter(q => q.clientSeqNo > data.payload.maxSeqNo);
                      this.saveQueue();
                  }
              } catch(e) {}
          };
          this.ws.onclose = () => {
              // Reconnect logic
              setTimeout(() => this.connectWs(), 5000);
          };
      } catch (e) {
          console.error("WS error:", e);
      }
  }

  private setupVisibilityHandler() {
      // Flush queue on pagehide/visibility hidden using sendBeacon
      const flush = () => {
          if (this.queue.length === 0 || !this.resumeToken) return;
          const payload = JSON.stringify({
              resumeToken: this.resumeToken,
              events: this.queue
          });
          const success = navigator.sendBeacon(this.backendUrl, payload);
          if (success) {
              this.queue = [];
              this.saveQueue();
          }
      };

      document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
              this.logEvent('TAB_SWITCH', { action: 'hidden' });
              flush();
          }
      });
      window.addEventListener('pagehide', flush);
  }
}

export const telemetry = new TelemetryService();
