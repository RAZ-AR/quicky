import type { Server } from 'socket.io';
import type { ServerToClientEvents } from '../plugins/socket.js';

// ─── Типизированный нотификатор ───────────────────────────────────────────────
// Единственное место где роуты шлют Socket.io события.
// Если io не передан (тесты) — вызовы просто игнорируются.

export class Notifier {
  constructor(private readonly io?: Server<never, ServerToClientEvents>) {}

  taskStateChanged(taskId: string, newState: string, triggeredBy: string | null) {
    this.io?.to(`task:${taskId}`).emit('task_state_changed', {
      task_id:      taskId,
      new_state:    newState,
      triggered_by: triggeredBy,
    });
  }

  taskFeedNew(task: Parameters<ServerToClientEvents['task_feed_new']>[0]) {
    this.io?.emit('task_feed_new', task);
  }

  taskFeedRemoved(taskId: string) {
    this.io?.emit('task_feed_removed', { task_id: taskId });
  }

  newMessage(
    taskId: string,
    msg: { id: string; messageType: string; content: string | null;
           photoUrl: string | null; options: unknown; priceProposed: unknown; expiresAt: Date | null }
  ) {
    this.io?.to(`task:${taskId}`).emit('new_message', {
      message_id:     msg.id,
      task_id:        taskId,
      message_type:   msg.messageType,
      content:        msg.content,
      photo_url:      msg.photoUrl,
      options:        (msg.options as string[] | null),
      price_proposed: msg.priceProposed ? Number(msg.priceProposed) : null,
      expires_at:     msg.expiresAt?.toISOString() ?? '',
    });
  }

  clientResponse(taskId: string, messageId: string, response: string) {
    this.io?.to(`task:${taskId}`).emit('client_response', {
      message_id: messageId,
      response,
    });
  }

  taskCompleted(taskId: string) {
    this.io?.to(`task:${taskId}`).emit('task_completed', { task_id: taskId });
  }
}
