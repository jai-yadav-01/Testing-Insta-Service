import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import config from './config';

class Server {
  private app: Application;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.PORT = config.port;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  private setupRoutes(): void {
    this.app.use('/instagram', routes);
  }

  public async start(): Promise<void> {
    try {
      // Start Express server
      this.app.listen(this.PORT, () => {
        console.log(`Server running on port ${this.PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start server
new Server().start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});