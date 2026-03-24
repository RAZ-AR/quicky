import type { FastifyPluginAsync } from 'fastify';
import { createReadStream, createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

// ─── Роут загрузки фотографий ─────────────────────────────────────────────────

const uploadRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /upload/photo — загрузка изображения
  fastify.post('/upload/photo', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Файл не найден' });
    }

    if (!data.mimetype.startsWith('image/')) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Допустимы только изображения' });
    }

    const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
    mkdirSync(uploadDir, { recursive: true });

    const ext = data.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(uploadDir, filename);

    await pipeline(data.file, createWriteStream(filepath));

    const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const url = `${baseUrl}/uploads/${filename}`;

    return reply.send({ url });
  });

  // GET /uploads/:filename — отдача загруженных файлов
  fastify.get('/uploads/:filename', async (req, reply) => {
    const { filename } = req.params as { filename: string };

    // Защита от path traversal
    if (!/^[a-f0-9-]+\.(jpg|jpeg|png)$/.test(filename)) {
      return reply.status(400).send({ error: 'BadRequest' });
    }

    const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
    const filepath = join(uploadDir, filename);

    try {
      const stream = createReadStream(filepath);
      const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return reply.type(mimeType).send(stream);
    } catch {
      return reply.status(404).send({ error: 'NotFound', message: 'Файл не найден' });
    }
  });
};

export default uploadRoutes;
