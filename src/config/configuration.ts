export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/crm',
    debug: process.env.MONGOOSE_DEBUG === 'true',
    debugLevel: parseInt(process.env.MONGOOSE_DEBUG_LEVEL || '0', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRE || '30d',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'CRM Application',
    version: process.env.APP_VERSION || '1.0.0',
    description: process.env.APP_DESCRIPTION || 'CRM Application',
  },
  mongoose: {
    debug: process.env.MONGOOSE_DEBUG || 'false',
    debugLevel: parseInt(process.env.MONGOOSE_DEBUG_LEVEL || '0', 10),
  },
});
