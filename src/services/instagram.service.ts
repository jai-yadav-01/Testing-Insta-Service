import axios from 'axios';
import {
  InstaReelsResponse,
  InstagramMediaItem,
  InstagramMediaResponse,
  InstagramUserResponse
} from '../types';
import config from '../config';

class InstagramService {
  private headers = {
    'User-Agent': config.instagram.userAgent,
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.5',
    'X-IG-App-ID': config.instagram.appId,
  };

  private apiBaseUrl = config.instagram.apiBaseUrl;
  private mediaCount = config.instagram.mediaCount;

  /**
   * Fetches public Instagram reels for a specific username
   * @param username Instagram username
   * @param cursor Pagination cursor
   * @returns Promise with Instagram reels data
   */
  public async fetchPublicInstagramReels(username: string, cursor: string | null = null): Promise<InstaReelsResponse> {
    try {
      console.log(`Fetching reels for username: ${username}`);

      // Step 1: Get user information
      const userInfoUrl = `${this.apiBaseUrl}/users/web_profile_info/?username=${username}`;
      console.log(`Fetching from ${userInfoUrl}`);

      const userResponse = await axios.get<InstagramUserResponse>(userInfoUrl, { headers: this.headers });

      // Check for successful response
      if (!userResponse.data || !userResponse.data.data || !userResponse.data.data.user) {
        console.error("No user data returned from Instagram API");
        throw new Error(`Instagram user '${username}' not found or not accessible`);
      }

      // Extract user info
      const user = userResponse.data.data.user;
      console.log(`Found user: ${user.username} (${user.id})`);

      // Check if account is private
      if (user.is_private) {
        console.log("Account is private");
        throw new Error("This Instagram account is private. Only public accounts are supported.");
      }

      // Step 2: Get the user's media
      const userId = user.id;
      let mediaUrl: string;

      if (cursor) {
        // Use consistent endpoint with max_id for pagination
        mediaUrl = `${this.apiBaseUrl}/feed/user/${userId}/?max_id=${cursor}&count=${this.mediaCount}`;
      } else {
        // Initial fetch
        mediaUrl = `${this.apiBaseUrl}/feed/user/${userId}/?count=${this.mediaCount}`;
      }

      console.log(`Fetching media from ${mediaUrl}`);
      const mediaResponse = await axios.get<InstagramMediaResponse>(mediaUrl, { headers: this.headers });

      // Step 3: Process media items
      if (!mediaResponse.data || !mediaResponse.data.items) {
        console.error("Unexpected media response format:", Object.keys(mediaResponse.data || {}));
        throw new Error("Failed to parse Instagram media data");
      }

      const mediaItems = mediaResponse.data.items;
      const pageInfo = {
        cursor: mediaResponse.data.next_max_id || null,
        hasNextPage: !!mediaResponse.data.next_max_id,
      };

      console.log(`Found ${mediaItems.length} total media items`);

      // Step 4: Filter only video content
      const videoItems = mediaItems.filter((item) => {
        return (
          item.is_video === true ||
          item.media_type === 2 || // Instagram API: 2 = video
          (item.video_versions && item.video_versions.length > 0)
        );
      });

      console.log(`Found ${videoItems.length} video items`);

      // Step 5: Format the video items to match the response format
      const reels = videoItems.map((item) => this.formatVideoItem(item, userId));

      return {
        nodes: reels,
        pageInfo: pageInfo,
      };
    } catch (error: any) {
      console.error("Error fetching Instagram reels:", error.message);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
      }

      if (error.message.includes("private")) {
        throw error; // Rethrow private account errors
      }
      throw new Error(
        "Failed to fetch Instagram reels. Please ensure the username is correct and the account is public."
      );
    }
  }

  private formatVideoItem(item: InstagramMediaItem, defaultUserId: string) {
    // Handle different response formats
    const id = item.user?.pk || defaultUserId;
    const code = item.code || item.shortcode || '';

    const directVideoUrl =
      item.video_url ||
      (item.video_versions && item.video_versions[0]?.url) ||
      null;

    return {
      id: id,
      code: code,
      originalUrl: directVideoUrl,
    };
  }
}

export default new InstagramService();