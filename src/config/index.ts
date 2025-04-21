import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '4000'),
  
  // Instagram API configuration
  instagram: {
    userAgent: process.env.INSTAGRAM_USER_AGENT || 'Instagram 219.0.0.12.117 Android',
    appId: process.env.INSTAGRAM_APP_ID || '936619743392459',
    apiBaseUrl: process.env.INSTAGRAM_API_BASE_URL || 'https://i.instagram.com/api/v1',
    mediaCount: parseInt(process.env.MEDIA_COUNT || '8'),
  }
};

export default config;