import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// ─── Геофильтрация (bounding box) ─────────────────────────────────────────────
// Без PostGIS — простой расчёт для MVP (Белград ~50x50 км)

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const KM_PER_DEGREE_LAT = 111.0;
  const kmPerDegreeLng = 111.0 * Math.cos((lat * Math.PI) / 180);
  const deltaLat = radiusKm / KM_PER_DEGREE_LAT;
  const deltaLng = radiusKm / kmPerDegreeLng;
  return {
    minLat: lat - deltaLat, maxLat: lat + deltaLat,
    minLng: lng - deltaLng, maxLng: lng + deltaLng,
  };
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Схемы ────────────────────────────────────────────────────────────────────

const FeedQuery = z.object({
  lat:       z.coerce.number().min(-90).max(90),
  lng:       z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(1).max(50).default(5),
});

// ─── Роуты ────────────────────────────────────────────────────────────────────

const taskFeedRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /tasks/feed — лента для исполнителя
  fastify.get('/tasks/feed', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    if (req.user.role !== 'executor' && req.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Лента доступна только исполнителям' });
    }

    const query = FeedQuery.safeParse(req.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Validation', message: query.error.errors[0]?.message });
    }

    const { lat, lng, radius_km } = query.data;
    const box = boundingBox(lat, lng, radius_km);

    // Ищем опубликованные задания в радиусе
    const tasks = await fastify.prisma.task.findMany({
      where: {
        state: 'published',
        city: 'Belgrade',
        toLat:  { gte: box.minLat, lte: box.maxLat },
        toLng:  { gte: box.minLng, lte: box.maxLng },
        expiresAt: { gt: new Date() },
      },
      include: { client: { select: { ratingAvg: true, ratingCount: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const feed = tasks.map((task: any) => ({
      id:            task.id,
      title:         task.title,
      category:      task.category,
      to_location:   { address: task.toAddress, lat: task.toLat, lng: task.toLng },
      price_final:   task.priceFinal ? Number(task.priceFinal) : null,
      scheduled_for: task.scheduledFor,
      urgency:       task.scheduledFor ? 'scheduled' : 'asap',
      client_rating: Number(task.client.ratingAvg),
      distance_km:   task.toLat && task.toLng
        ? Math.round(distanceKm(lat, lng, task.toLat, task.toLng) * 10) / 10
        : null,
      created_at: task.createdAt,
    }));

    return reply.send({ tasks: feed, total: feed.length });
  });
};

export default taskFeedRoutes;
