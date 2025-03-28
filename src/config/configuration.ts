export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/crm',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRE || '30d',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  },
  nodeEnv: process.env.NODE_ENV || 'development',
});
