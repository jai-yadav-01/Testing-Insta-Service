/**
 * Application configuration with environment variable support
 */
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },
  
  instagram: {
    // Instagram API configuration
    apiBaseUrl: process.env.INSTAGRAM_API_URL || 'https://i.instagram.com/api/v1',
    appId: process.env.INSTAGRAM_APP_ID || '936619743392459', // Instagram Web App ID
    mediaCount: process.env.MEDIA_COUNT ? parseInt(process.env.MEDIA_COUNT) : 50,
    
    // Proxy configuration
    useProxy: process.env.USE_PROXY !== 'false',
    proxyRotation: process.env.PROXY_ROTATION !== 'false',
    
    // Request configuration
    requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT) : 15000,
    maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 3,
    retryDelay: process.env.RETRY_DELAY ? parseInt(process.env.RETRY_DELAY) : 1000
  },
  
  // Caching options
  cache: {
    enabled: process.env.ENABLE_CACHE !== 'false',
    ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 3600 // 1 hour in seconds
  },
  
  // Logging options
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'pretty'
  },
  
  // Security options
  security: {
    rateLimitRequests: process.env.RATE_LIMIT_REQUESTS ? parseInt(process.env.RATE_LIMIT_REQUESTS) : 100,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW) : 60 * 60 * 1000 // 1 hour
  }
};

export default config;