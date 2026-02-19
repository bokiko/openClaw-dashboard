import { isDbAvailable, query } from '@/lib/db';
import type { Notification } from '@/types';

export interface CreateNotification {
  type: string;
  title: string;
  body?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  entityType?: string;
  entityId?: string;
}

export async function pushNotification(input: CreateNotification): Promise<Notification | null> {
  if (!isDbAvailable()) return null;

  try {
    const result = await query<{
      id: number; type: string; title: string; body: string;
      severity: string; entity_type: string | null; entity_id: string | null;
      read: boolean; created_at: Date;
    }>(
      `INSERT INTO notifications (type, title, body, severity, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.type,
        input.title,
        input.body ?? '',
        input.severity ?? 'info',
        input.entityType ?? null,
        input.entityId ?? null,
      ],
    );

    const row = result.rows[0];
    const notification: Notification = {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      severity: row.severity as Notification['severity'],
      entityType: row.entity_type ?? undefined,
      entityId: row.entity_id ?? undefined,
      read: row.read,
      createdAt: row.created_at.getTime(),
    };

    // Broadcast via WS
    try {
      const { broadcast } = await import('@/lib/ws-server');
      broadcast('notification:new', notification);
    } catch { /* WS not available */ }

    return notification;
  } catch (err) {
    console.error('Failed to push notification:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getNotifications(opts?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
  if (!isDbAvailable()) return [];

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.unreadOnly) {
    conditions.push(`read = FALSE`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit ?? 50;

  const result = await query<{
    id: number; type: string; title: string; body: string;
    severity: string; entity_type: string | null; entity_id: string | null;
    read: boolean; created_at: Date;
  }>(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    [...params, limit],
  );

  return result.rows.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    severity: r.severity as Notification['severity'],
    entityType: r.entity_type ?? undefined,
    entityId: r.entity_id ?? undefined,
    read: r.read,
    createdAt: r.created_at.getTime(),
  }));
}

export async function markNotificationRead(id: number): Promise<boolean> {
  if (!isDbAvailable()) return false;
  const result = await query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(): Promise<number> {
  if (!isDbAvailable()) return 0;
  const result = await query(`UPDATE notifications SET read = TRUE WHERE read = FALSE`);
  return result.rowCount ?? 0;
}

export async function deleteNotification(id: number): Promise<boolean> {
  if (!isDbAvailable()) return false;
  const result = await query(`DELETE FROM notifications WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteAllNotifications(): Promise<number> {
  if (!isDbAvailable()) return 0;
  const result = await query(`DELETE FROM notifications`);
  return result.rowCount ?? 0;
}
