import express from 'express';
import cors from 'cors';
import instagramRoutes from './routes/index';
import InstagramService from './services/instagram.service';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/instagram', instagramRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// If running in local environment, start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Test proxies on startup
    console.log('Testing proxy connections...');
    InstagramService.testProxies()
      .then(results => {
        const working = results.filter(r => r.working).length;
        console.log(`Proxy test completed: ${working}/${results.length} proxies working`);
      })
      .catch(err => console.error('Proxy test failed:', err));
  });
}

// Export app for Vercel
export default app;