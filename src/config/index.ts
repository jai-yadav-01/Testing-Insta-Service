// Configuration for the Instagram service

const config = {
  server: {
    port: process.env.PORT || 4000,
    host: process.env.HOST || 'localhost'
  },
  instagram: {
    // Instagram API configuration
    apiBaseUrl: 'https://i.instagram.com/api/v1',
    appId: '936619743392459', // Instagram Web App ID
    mediaCount: 8, // Number of media items to fetch per request
    
    // Proxy configuration
    useProxy: true,
    proxyRotation: true,
    proxyRetries: 3,
    
    // Rate limiting
    requestDelay: 1000, // Milliseconds to wait between requests
    maxConcurrentRequests: 2
  },
  cache: {
    enabled: true,
    ttl: 3600 // Cache time-to-live in seconds (1 hour)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

export default config;