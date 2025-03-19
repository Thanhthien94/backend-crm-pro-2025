import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import specs from '../config/swagger';

// Custom Swagger CSS options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { 
      display: none;
    }
    .swagger-ui .info {
      margin-top: 20px;
    }
    .swagger-ui .info .title {
      color: #333;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .swagger-ui .opblock .opblock-summary-operation-id,
    .swagger-ui .opblock .opblock-summary-path,
    .swagger-ui .opblock .opblock-summary-path__deprecated {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .swagger-ui .opblock .opblock-summary-description {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 400;
    }
    .swagger-ui .scheme-container {
      background-color: #f8f9fa;
      margin: 0 0 20px;
      padding: 15px 0;
    }
    .swagger-ui section.models {
      border: 1px solid #ebebeb;
    }
    .swagger-ui .model-box {
      background-color: #f8f9fa;
    }
    .swagger-ui section.models .model-container {
      margin: 0 20px 15px;
      background-color: white;
      border-radius: 4px;
      border: 1px solid #ebebeb;
    }
    .swagger-ui section.models h4 {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .swagger-ui .opblock {
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .swagger-ui .opblock .opblock-summary {
      padding: 8px 20px;
    }
    .swagger-ui .btn {
      border-radius: 4px;
    }
    .swagger-ui .opblock-tag {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 20px;
    }
    .swagger-ui .opblock-tag small {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
  `,
  customSiteTitle: 'CRM API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    filter: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 1,
    persistAuthorization: true
  }
};

// Setup Swagger UI middleware
export const setupSwaggerUI = (app: any) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
  
  // Redirect from /docs to /api-docs for convenience
  app.get('/docs', (req: Request, res: Response) => {
    res.redirect('/api-docs');
  });
};

// Middleware to add CORS headers for Swagger assets
export const swaggerAssetsCORS = (req: Request, res: Response, next: NextFunction) => {
  if (req.url.includes('/api-docs/')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
  next();
};