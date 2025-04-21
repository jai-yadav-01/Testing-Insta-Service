import { Router } from 'express';
import instagramController from '../controllers/instagram.controller';

const router = Router();

// Instagram reels routes
router.get('/reels/:username', instagramController.getReels);

// Utility routes
router.get('/test-proxies', instagramController.testProxies);

export default router;