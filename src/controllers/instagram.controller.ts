import { Request, Response } from 'express';
import InstagramService from '../services/instagram.service';

class InstagramController {
  /**
   * Get Instagram reels for a specific username
   * @route GET /instagram/reels/:username
   */
  async getReels(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const { cursor } = req.query;
      
      // Basic validation
      if (!username) {
        res.status(400).json({
          success: false,
          message: 'Username is required'
        });
        return;
      }

      // Get reels from service
      const reelsData = await InstagramService.fetchPublicInstagramReels(
        username,
        cursor as string || null
      );

      // Return successful response
      res.status(200).json(reelsData);
    } catch (error: any) {
      console.error('Error in Instagram controller:', error);
      
      // Handle specific error cases
      if (error.message.includes('private')) {
        res.status(403).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      // Generic error response
      res.status(500).json({
        success: false,
        message: 'Failed to fetch Instagram reels. Please ensure the username is correct and the account is public.'
      });
    }
  }

  /**
   * Test proxy connections
   * @route GET /instagram/test-proxies
   */
  async testProxies(req: Request, res: Response): Promise<void> {
    try {
      const results = await InstagramService.testProxies();
      
      const summary = {
        total: results.length,
        working: results.filter(r => r.working).length,
        nonWorking: results.filter(r => !r.working).length
      };
      
      res.status(200).json({
        success: true,
        summary,
        results
      });
    } catch (error: any) {
      console.error('Error testing proxies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test proxies'
      });
    }
  }
}

export default new InstagramController();