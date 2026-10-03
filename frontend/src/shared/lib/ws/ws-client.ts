import { http } from '@/shared/lib/http/client';
import { env } from '@/shared/config/env';
import { toast } from 'sonner';
import i18n from '@/shared/i18n';
import type { QueryClient } from '@tanstack/react-query';

interface WSTicketResponse {
  ticket: string;
  expiresIn: number;
}

interface NotificationPayload {
  id: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  params: Record<string, string | number>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface EntityChangedPayload {
  entity: 'recipe' | 'trial' | 'masterdata' | 'settings';
  id: string;
  action: 'created' | 'updated' | 'deleted';
}

export class WSManager {
  private socket: WebSocket | null = null;
  private queryClient: QueryClient | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private backoff = env.wsBackoffMinMs;
  private isExplicitlyClosed = false;

  constructor(queryClient?: QueryClient) {
    if (queryClient) {
      this.queryClient = queryClient;
    }
  }

  setQueryClient(qc: QueryClient) {
    this.queryClient = qc;
  }

  async connect() {
    this.isExplicitlyClosed = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ticketRes = await http.post<WSTicketResponse>('/ws/ticket');
      if (!ticketRes || !ticketRes.ticket) {
        this.scheduleReconnect();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?ticket=${encodeURIComponent(ticketRes.ticket)}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.backoff = env.wsBackoffMinMs;
        this.startPing();
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // Non-JSON message
        }
      };

      this.socket.onclose = () => {
        this.stopPing();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private handleMessage(msg: { type: string; data?: unknown }) {
    if (msg.type === 'notification' && msg.data) {
      const n = msg.data as NotificationPayload;
      const key = `notifications.types.${n.type}`;
      const title = i18n.t(key, n.params);

      if (n.severity === 'SUCCESS') {
        toast.success(title);
      } else if (n.severity === 'WARNING') {
        toast.warning(title);
      } else if (n.severity === 'ERROR') {
        toast.error(title);
      } else {
        toast.info(title);
      }

      if (this.queryClient) {
        this.queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    } else if (msg.type === 'entity.changed' && msg.data) {
      const change = msg.data as EntityChangedPayload;
      if (this.queryClient) {
        if (change.entity === 'recipe') {
          this.queryClient.invalidateQueries({ queryKey: ['recipes'] });
        } else if (change.entity === 'trial') {
          this.queryClient.invalidateQueries({ queryKey: ['trials'] });
        } else if (change.entity === 'masterdata') {
          this.queryClient.invalidateQueries({ queryKey: ['masterdata'] });
        }
      }
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, env.wsPingIntervalMs);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isExplicitlyClosed) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.backoff = Math.min(this.backoff * 1.5, env.wsBackoffMaxMs);
      this.connect();
    }, this.backoff);
  }
}

export const wsManager = new WSManager();
