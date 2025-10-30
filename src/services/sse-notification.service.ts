import { Injectable } from '@nestjs/common';
import { Response } from 'express';

export interface NotificationEvent {
  type:
    | 'interest_request'
    | 'match_created'
    | 'ad_status_change'
    | 'interest_response'
    | 'connection';
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface InterestRequestData {
  id: string;
  fromUser: unknown;
  fromAd: unknown;
  message: string | null;
  compatibilityScore: number;
  createdAt: Date;
}

export interface MatchData {
  id: string;
  compatibilityScore: number;
  createdAt: Date;
}

@Injectable()
export class SseNotificationService {
  private clients = new Map<string, Response>();
  private heartbeats = new Map<string, NodeJS.Timer>();

  addClient(userId: string, res: Response) {
    // Set SSE headers (no wildcard ACAO; rely on global CORS)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no',
    });
    // Flush headers so client sees the stream immediately
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof (res as any).flushHeaders === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (res as any).flushHeaders();
    }

    // Initial event
    this.sendToClient(userId, {
      type: 'connection',
      data: { message: 'Connected to notifications' },
      timestamp: new Date(),
    });

    // Heartbeat every 25s to keep proxies from closing the stream
    const hb = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        // If writing fails, connection is likely closed; cleanup below on 'close'
      }
    }, 25000);

    this.clients.set(userId, res);
    this.heartbeats.set(userId, hb);

    res.on('close', () => {
      this.clients.delete(userId);
      const t = this.heartbeats.get(userId);
      if (t) clearInterval(t as unknown as NodeJS.Timeout);
      this.heartbeats.delete(userId);
      console.log(`SSE client disconnected for user: ${userId}`);
    });

    console.log(`SSE client connected for user: ${userId}`);
  }

  sendToClient(userId: string, event: NotificationEvent) {
    const client = this.clients.get(userId);
    if (client) {
      try {
        const sseData = `data: ${JSON.stringify(event)}\n\n`;
        client.write(sseData);
        // Optional: flush write if compression/proxy involved
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (typeof (client as any).flush === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          (client as any).flush();
        }
        console.log(`SSE notification sent to user ${userId}:`, event.type);
      } catch (error) {
        console.error(`Error sending SSE to user ${userId}:`, error);
        try {
          client.end();
        } catch {
          /* empty */
        }
        this.clients.delete(userId);
        const t = this.heartbeats.get(userId);
        if (t) clearInterval(t as unknown as NodeJS.Timeout);
        this.heartbeats.delete(userId);
      }
    } else {
      console.log(`No SSE client found for user: ${userId}`);
    }
  }

  sendInterestRequestNotification(
    toUserId: string,
    interestRequest: InterestRequestData,
  ) {
    this.sendToClient(toUserId, {
      type: 'interest_request',
      data: {
        id: interestRequest.id,
        fromUser: interestRequest.fromUser,
        fromAd: interestRequest.fromAd,
        message: interestRequest.message,
        compatibilityScore: interestRequest.compatibilityScore,
        createdAt: interestRequest.createdAt,
      },
      timestamp: new Date(),
    });
  }

  sendMatchCreatedNotification(
    user1Id: string,
    user2Id: string,
    match: MatchData,
  ) {
    // Send to both users
    [user1Id, user2Id].forEach((userId) => {
      this.sendToClient(userId, {
        type: 'match_created',
        data: {
          matchId: match.id,
          partnerId: userId === user1Id ? user2Id : user1Id,
          compatibilityScore: match.compatibilityScore,
          createdAt: match.createdAt,
        },
        timestamp: new Date(),
      });
    });
  }

  sendAdStatusChangeNotification(
    userId: string,
    adId: string,
    status: string,
    message: string,
  ) {
    this.sendToClient(userId, {
      type: 'ad_status_change',
      data: {
        adId,
        status,
        message,
      },
      timestamp: new Date(),
    });
  }

  sendInterestResponseNotification(
    fromUserId: string,
    response: Record<string, unknown>,
  ) {
    this.sendToClient(fromUserId, {
      type: 'interest_response',
      data: response,
      timestamp: new Date(),
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  isClientConnected(userId: string): boolean {
    return this.clients.has(userId);
  }
}
