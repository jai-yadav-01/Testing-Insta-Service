import { Request, Response } from 'express';
import instagramService from '../services/instagram.service';

class InstagramController {
  public test = async (req: Request, res: Response): Promise<void> => {
    res.json({ message: "Server is running properly!" });
  };

  public getReels = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params;
      const cursor = req.query.cursor as string | undefined;

      const result = await instagramService.fetchPublicInstagramReels(username, cursor || null);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
}

export default new InstagramController();