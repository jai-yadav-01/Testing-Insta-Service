import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import instagramRoutes from './routes/index';
import instagramService from './services/instagram.service';
import { ProxyTestResult } from './types/index';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.use('/instagram', instagramRoutes);

// Health check endpoint
app.get('/health', (_, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Root endpoint
app.get('/', (_, res: Response) => {
  res.status(200).json({
    message: 'Instagram Service API is running',
    endpoints: {
      reels: '/instagram/reels/:username',
      testProxies: '/instagram/test-proxies',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Test proxies on startup
    console.log('Testing proxy connections...');
    instagramService.testProxies()
      .then((results: ProxyTestResult[]) => {
        const working = results.filter(r => r.working).length;
        console.log(`Proxy test completed: ${working}/${results.length} proxies working`);
      })
      .catch((err: Error) => console.error('Proxy test failed:', err));
  });
}

// Export app for vercel
export default app;