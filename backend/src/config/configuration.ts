export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'Goldnest API',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  storage: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    signedUrlExpirySeconds: parseInt(process.env.S3_SIGNED_URL_EXPIRY_SECONDS || '300', 10),
  },

  sms: {
    apiKey: process.env.SMS_PROVIDER_API_KEY,
    senderId: process.env.SMS_SENDER_ID,
  },

  paymentGateway: {
    keyId: process.env.PAYMENT_GATEWAY_KEY_ID,
    keySecret: process.env.PAYMENT_GATEWAY_KEY_SECRET,
    webhookSecret: process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET,
  },

  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  },
});
