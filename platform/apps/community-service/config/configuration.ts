export default () => ({
  port: Number(process.env.COMMUNITY_SERVICE_PORT ?? 3005),
  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/community_db',
  },
});
