import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import type { FastifyPluginAsync } from 'fastify';

// ─── Типы событий ─────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  task_state_changed:  (data: { task_id: string; new_state: string; triggered_by: string | null }) => void;
  task_feed_new:       (data: TaskFeedItem) => void;
  task_feed_removed:   (data: { task_id: string }) => void;
  new_message:         (data: TaskMessageEvent) => void;
  message_resolved:    (data: { message_id: string; resolution: string }) => void;
  client_response:     (data: { message_id: string; response: string }) => void;
  timeout_warning:     (data: { message_id: string; seconds_remaining: number }) => void;
  task_completed:      (data: { task_id: string }) => void;
}

export interface ClientToServerEvents {
  join_task_room:            (data: { task_id: string }) => void;
  leave_task_room:           (data: { task_id: string }) => void;
  executor_location_update:  (data: { lat: number; lng: number }) => void;
}

interface TaskFeedItem {
  id: string; title: string; category: string;
  to_location: { address: string; lat: number | null; lng: number | null };
  price_final: number | null; urgency: string; distance_km: number | null;
}

interface TaskMessageEvent {
  message_id: string; task_id: string;
  message_type: string; content: string | null;
  photo_url: string | null; options: string[] | null;
  price_proposed: number | null; expires_at: string;
}

// ─── Плагин ───────────────────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyInstance {
    io: Server<ClientToServerEvents, ServerToClientEvents>;
  }
}

const socketPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(fastify.server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    socket.on('join_task_room', ({ task_id }) => {
      socket.join(`task:${task_id}`);
    });

    socket.on('leave_task_room', ({ task_id }) => {
      socket.leave(`task:${task_id}`);
    });

    socket.on('executor_location_update', async (data) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return;
      try {
        const payload = fastify.jwt.decode<{ userId: string }>(token);
        if (!payload?.userId) return;
        await fastify.prisma.user.update({
          where: { id: payload.userId },
          data: {
            locationLat: data.lat,
            locationLng: data.lng,
            locationUpdatedAt: new Date(),
          },
        });
      } catch { /* ignore */ }
    });
  });

  fastify.decorate('io', io);
  fastify.addHook('onClose', async () => { await io.close(); });
});

export default socketPlugin;
