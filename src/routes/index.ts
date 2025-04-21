import { Router } from 'express';
import InstagramController from '../controllers/instagram.controller';

const router = Router();

// Instagram reels routes
router.get('/reels/:username', InstagramController.getReels);

// Utility routes
router.get('/test-proxies', InstagramController.testProxies);

export default router;