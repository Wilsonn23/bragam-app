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
    { name: 'POI' },
    { name: 'Users' },
  ],
  paths: {
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
