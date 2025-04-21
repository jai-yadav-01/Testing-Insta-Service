import { Router } from 'express';
import instagramController from '../controllers/instagram.controller';

const router = Router();

router.get('/service/health', instagramController.test);

router.get('/reels/:username', instagramController.getReels);

export default router;