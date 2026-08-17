export default () => ({
  port: parseInt(process.env.COMMERCE_SERVICE_PORT || '3003', 10),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres123',
    name: process.env.COMMERCE_DB_NAME || 'commerce_db',
    synchronize: process.env.DATABASE_SYNC === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  },
  checkout: {
    sessionTtlMinutes: parseInt(process.env.CHECKOUT_SESSION_TTL_MINUTES || '15', 10),
    shippingBaseFee: parseInt(process.env.CHECKOUT_SHIPPING_BASE_FEE || '30000', 10),
  },
  storage: {
    coverMaxBytes: parseInt(process.env.BOOK_COVER_MAX_BYTES || '5242880', 10),
    pdfMaxBytes: parseInt(process.env.BOOK_PDF_MAX_BYTES || '104857600', 10),
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    r2: {
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucket: process.env.CLOUDFLARE_R2_BUCKET || 'huki-ebooks',
    },
  },
});
