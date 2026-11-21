export default () => ({
  port: Number(process.env.COMMUNITY_SERVICE_PORT ?? 3005),
  mongodb: {
    uri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/community_db",
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "your-super-secret-jwt-key",
  },
  services: {
    commerceUrl: process.env.COMMERCE_SERVICE_URL ?? (process.env.NODE_ENV === "staging" ? "http://commerce-service-uat:3003" : "http://localhost:3003"),
    businessUrl: process.env.BUSINESS_SERVICE_URL ?? (process.env.NODE_ENV === "staging" ? "http://business-service-uat:3002" : "http://localhost:3002"),
  },
  storage: {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
});
