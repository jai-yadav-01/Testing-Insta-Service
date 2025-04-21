import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import config from './config';
import instagramRoutes from './routes/index';
import InstagramService from './services/instagram.service';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
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

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test proxies on startup
  if (config.instagram.useProxy) {
    console.log('Testing proxy connections...');
    InstagramService.testProxies()
      .then(() => console.log('Proxy test completed'))
      .catch(err => console.error('Proxy test failed:', err));
  }
});