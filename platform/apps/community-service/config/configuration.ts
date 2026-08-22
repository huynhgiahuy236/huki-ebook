export default () => ({
  port: Number(process.env.COMMUNITY_SERVICE_PORT ?? 3005),
  mongodb: {
    uri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/community_db",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "your-super-secret-jwt-key",
  },
  storage: {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },
});
