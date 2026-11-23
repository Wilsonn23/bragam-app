module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'BRAGAm API',
    version: '1.0.0',
    description: 'API POI Braga dan CRUD user untuk development.',
  },
  servers: [{ url: 'http://localhost:5000' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'POI' },
    { name: 'Users' },
    { name: 'Ratings' },
    { name: 'Preferences' },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login dan dapatkan token sesi (berlaku 7 hari)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password'],
            properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } },
          } } },
        },
        responses: {
          200: { description: 'Login berhasil', content: { 'application/json': { schema: { $ref: '#/components/schemas/Session' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { description: 'Email atau password salah' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Daftar akun baru dan langsung dapatkan token sesi',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUser' } } },
        },
        responses: {
          201: { description: 'Akun dibuat', content: { 'application/json': { schema: { $ref: '#/components/schemas/Session' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { description: 'Email sudah terdaftar' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Cek status server',
        responses: {
          200: {
            description: 'Server aktif',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
    '/api/pois': {
      get: {
        tags: ['POI'],
        summary: 'Ambil semua POI',
        responses: {
          200: {
            description: 'Daftar POI',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Poi' } } } },
          },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
    },
    '/api/pois/nearby': {
      get: {
        tags: ['POI'],
        summary: 'Ambil POI terdekat berdasarkan koordinat',
        parameters: [
          { $ref: '#/components/parameters/Latitude' },
          { $ref: '#/components/parameters/Longitude' },
          {
            name: 'maxRadius',
            in: 'query',
            required: false,
            schema: { type: 'number', minimum: 0, default: 15 },
            example: 15,
          },
        ],
        responses: {
          200: {
            description: 'POI terdekat atau null jika tidak ditemukan',
            content: { 'application/json': { schema: { nullable: true, allOf: [{ $ref: '#/components/schemas/Poi' }] } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
    },
    '/api/pois/{poiId}/ratings': {
      parameters: [{ $ref: '#/components/parameters/PoiId' }],
      get: {
        tags: ['Ratings'],
        summary: 'Ambil ringkasan dan daftar rating POI',
        responses: {
          200: { description: 'Ringkasan rata-rata, jumlah, distribusi, dan daftar rating' },
          404: { description: 'POI tidak ditemukan' },
        },
      },
      post: {
        tags: ['Ratings'],
        summary: 'Buat atau memperbarui rating user untuk POI',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRating' } } },
        },
        responses: {
          201: { description: 'Rating berhasil disimpan' },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { description: 'POI atau user tidak ditemukan' },
        },
      },
    },
    '/api/ratings/{id}': {
      parameters: [{ $ref: '#/components/parameters/RatingId' }],
      get: {
        tags: ['Ratings'],
        summary: 'Ambil satu rating',
        responses: { 200: { description: 'Detail rating' }, 404: { description: 'Rating tidak ditemukan' } },
      },
      patch: {
        tags: ['Ratings'],
        summary: 'Perbarui rating dan/atau review',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRating' } } } },
        responses: { 200: { description: 'Rating diperbarui' }, 400: { $ref: '#/components/responses/ValidationError' }, 404: { description: 'Rating tidak ditemukan' } },
      },
      delete: {
        tags: ['Ratings'],
        summary: 'Hapus rating',
        security: [{ bearerAuth: [] }],
        responses: { 204: { description: 'Rating dihapus' }, 404: { description: 'Rating tidak ditemukan' } },
      },
    },
    '/api/users/{id}/ratings': {
      parameters: [{ $ref: '#/components/parameters/UserId' }],
      get: {
        tags: ['Ratings'],
        summary: 'Ambil semua rating milik user',
        responses: { 200: { description: 'Daftar rating user' }, 400: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/api/users/{id}/preferences': {
      parameters: [{ $ref: '#/components/parameters/UserId' }],
      get: {
        tags: ['Preferences'],
        summary: 'Ambil preferensi rekomendasi user (default bila belum disimpan)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Preferensi user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PreferencesResponse' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
      put: {
        tags: ['Preferences'],
        summary: 'Simpan preferensi rekomendasi user (field yang tidak dikirim memakai default)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Preferences' } } },
        },
        responses: {
          200: {
            description: 'Preferensi tersimpan',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PreferencesResponse' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { description: 'User tidak ditemukan' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'Ambil semua user',
        responses: {
          200: {
            description: 'Daftar user tanpa password hash',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } },
          },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Buat user baru',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUser' } } },
        },
        responses: {
          201: {
            description: 'User berhasil dibuat',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { description: 'Email sudah terdaftar' },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
    },
    '/api/users/{id}': {
      parameters: [{ $ref: '#/components/parameters/UserId' }],
      get: {
        tags: ['Users'],
        summary: 'Ambil user berdasarkan ID',
        responses: {
          200: {
            description: 'Detail user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { description: 'User tidak ditemukan' },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Perbarui user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUser' } } },
        },
        responses: {
          200: {
            description: 'User berhasil diperbarui',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { description: 'User tidak ditemukan' },
          409: { description: 'Email sudah terdaftar' },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Hapus user',
        responses: {
          204: { description: 'User berhasil dihapus' },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { description: 'User tidak ditemukan' },
          500: { $ref: '#/components/responses/DatabaseError' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token dari /api/auth/login atau /api/auth/register. ' +
          '401 = token tidak ada/kedaluwarsa, 403 = data milik user lain.',
      },
    },
    parameters: {
      Latitude: {
        name: 'latitude',
        in: 'query',
        required: true,
        schema: { type: 'number', minimum: -90, maximum: 90 },
        example: -6.91775,
      },
      Longitude: {
        name: 'longitude',
        in: 'query',
        required: true,
        schema: { type: 'number', minimum: -180, maximum: 180 },
        example: 107.60912,
      },
      UserId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      PoiId: {
        name: 'poiId',
        in: 'path',
        required: true,
        schema: { type: 'string', example: 'P01' },
      },
      RatingId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
    },
    schemas: {
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'OK' },
          databaseConfigured: { type: 'boolean', example: true },
          message: { type: 'string', example: 'BRAGAm API Server Running' },
        },
      },
      Poi: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'P01' },
          name: { type: 'string', example: 'Maison Bogerijen' },
          category: { type: 'string', example: 'Kuliner Legendaris' },
          latitude: { type: 'number', example: -6.91775 },
          longitude: { type: 'number', example: 107.60912 },
          triggerRadiusMeters: { type: 'number', example: 10 },
          cooldownSeconds: { type: 'number', example: 60 },
          description: { type: 'string' },
          notificationBody: { type: 'string', nullable: true },
          shortDescription: { type: 'string' },
          notificationTitle: { type: 'string' },
          audioGuideUrl: { type: 'string', nullable: true },
          distanceMeters: { type: 'number', nullable: true },
          timeCategory: { type: 'string', example: 'siang, malam' },
          environment: { type: 'string', enum: ['indoor', 'outdoor', 'both'] },
          avgDurationMinutes: { type: 'number', example: 45 },
        },
      },
      Preferences: {
        type: 'object',
        properties: {
          interests: {
            type: 'array',
            items: { type: 'string', enum: ['kuliner', 'kafe', 'oleh', 'sejarah', 'hiburan', 'malam'] },
            description: 'Kosong berarti semua kategori',
          },
          visitTime: { type: 'string', enum: ['auto', 'pagi', 'siang', 'malam'], default: 'auto' },
          environment: { type: 'string', enum: ['any', 'indoor', 'outdoor'], default: 'any' },
          maxBudget: { type: 'integer', nullable: true, enum: [null, 50000, 100000, 200000] },
          hideClosed: { type: 'boolean', default: true },
          weights: {
            type: 'object',
            description: 'Bobot faktor 0 (abaikan) sampai 3 (tinggi); minimal satu > 0',
            properties: {
              preference: { type: 'integer', minimum: 0, maximum: 3, default: 2 },
              time: { type: 'integer', minimum: 0, maximum: 3, default: 2 },
              location: { type: 'integer', minimum: 0, maximum: 3, default: 2 },
              rating: { type: 'integer', minimum: 0, maximum: 3, default: 2 },
              weather: { type: 'integer', minimum: 0, maximum: 3, default: 2 },
            },
          },
        },
      },
      PreferencesResponse: {
        type: 'object',
        properties: {
          preferences: { $ref: '#/components/schemas/Preferences' },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Session: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string', description: 'Kirim sebagai header Authorization: Bearer <token>' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateUser: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          name: { type: 'string', nullable: true, example: 'User Test' },
          password: { type: 'string', minLength: 8, format: 'password', example: 'password123' },
        },
      },
      UpdateUser: {
        type: 'object',
        minProperties: 1,
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', nullable: true },
          password: { type: 'string', minLength: 8, format: 'password' },
        },
      },
      CreateRating: {
        type: 'object',
        required: ['userId', 'rating'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          review: { type: 'string', maxLength: 2000, nullable: true },
        },
      },
      UpdateRating: {
        type: 'object',
        minProperties: 1,
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          review: { type: 'string', maxLength: 2000, nullable: true },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
    responses: {
      ValidationError: {
        description: 'Input tidak valid',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      DatabaseError: {
        description: 'Database request gagal',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
};
