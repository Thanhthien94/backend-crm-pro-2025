// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
const packageJson = require('../../package.json');
const version = packageJson.version;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM API Documentation',
      version,
      description: 'Documentation for the CRM API',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API Version 1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts', 
    './src/models/*.ts',
    './src/swagger/*.ts' // Thêm đường dẫn này để tham chiếu các file Swagger mới
  ],
};

const specs = swaggerJsdoc(options);

export default specs;