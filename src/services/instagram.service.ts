import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { 
  InstaReelsResponse, 
  InstagramMediaItem, 
  InstagramMediaResponse, 
  InstagramUserResponse 
} from '../types';
import { proxyService } from './proxy.service';

class InstagramService {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-IG-App-ID': '936619743392459',
    'Referer': 'https://www.instagram.com/',
    'Origin': 'https://www.instagram.com'
  };

  private readonly apiBaseUrl = 'https://i.instagram.com/api/v1';
  private readonly mediaCount = 50;
  private readonly requestTimeout = 15000;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  /**
   * Test all configured proxies
   */
  public async testProxies() {
    return await proxyService.testProxies();
  }

  /**
   * Fetch public Instagram reels for a username
   */
  public async fetchPublicInstagramReels(
    username: string, 
    cursor: string | null = null
  ): Promise<InstaReelsResponse> {
    console.log(`Fetching reels for username: ${username}`);
    
    let attemptCount = 0;
    const maxAttempts = this.maxRetries + 1; // +1 for direct connection attempt
    
    while (attemptCount < maxAttempts) {
      try {
        // Try with proxy first
        if (attemptCount < this.maxRetries) {
          const proxyInfo = proxyService.getNextProxy();
          
          if (proxyInfo) {
            console.log(`Attempt ${attemptCount + 1}: Using proxy #${proxyInfo.index + 1}`);
            
            try {
              return await this.fetchReelsWithAgent(username, cursor, proxyInfo.agent);
            } catch (error) {
              // Mark proxy as failed and try next
              proxyService.markProxyAsFailed(proxyInfo.index);
              attemptCount++;
              continue;
            }
          } else {
            console.log('No working proxies available, using direct connection');
            return await this.fetchReelsWithAgent(username, cursor, null);
          }
        } else {
          // Last resort: try without a proxy
          console.log("All proxy attempts failed. Trying direct connection...");
          return await this.fetchReelsWithAgent(username, cursor, null);
        }
      } catch (error: any) {
        attemptCount++;
        
        if (attemptCount >= maxAttempts) {
          console.error("All attempts failed.");
          throw error;
        }
        
        console.error(`Attempt ${attemptCount} failed:`, error.message);
        // Delay before next attempt
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    
    throw new Error("Failed to fetch Instagram reels after multiple attempts");
  }

  /**
   * Internal method to fetch reels with a specific agent
   */
  private async fetchReelsWithAgent(
    username: string, 
    cursor: string | null, 
    agent: HttpsProxyAgent<string> | null
  ): Promise<InstaReelsResponse> {
    try {
      // Step 1: Get user information
      const userInfoUrl = `${this.apiBaseUrl}/users/web_profile_info/?username=${username}`;
      console.log(`Fetching from ${userInfoUrl}`);
      
      const requestOptions: AxiosRequestConfig = {
        headers: this.headers,
        httpsAgent: agent,
        timeout: this.requestTimeout
      };
      
      const userResponse = await axios.get<InstagramUserResponse>(userInfoUrl, requestOptions);
      
      if (!userResponse.data?.data?.user) {
        console.error("No user data returned from Instagram API");
        throw new Error(`Instagram user '${username}' not found or not accessible`);
      }
      
      const user = userResponse.data.data.user;
      console.log(`Found user: ${user.username} (${user.id})`);
      
      if (user.is_private) {
        console.log("Account is private");
        throw new Error("This Instagram account is private. Only public accounts are supported.");
      }
      
      // Step 2: Get the user's media
      const userId = user.id;
      let mediaUrl = cursor
        ? `${this.apiBaseUrl}/feed/user/${userId}/?max_id=${cursor}&count=${this.mediaCount}`
        : `${this.apiBaseUrl}/feed/user/${userId}/?count=${this.mediaCount}`;
      
      console.log(`Fetching media from ${mediaUrl}`);
      const mediaResponse = await axios.get<InstagramMediaResponse>(mediaUrl, requestOptions);
      
      if (!mediaResponse.data?.items) {
        console.error("Unexpected media response format:", Object.keys(mediaResponse.data || {}));
        throw new Error("Failed to parse Instagram media data");
      }
      
      const mediaItems = mediaResponse.data.items;
      const pageInfo = {
        cursor: mediaResponse.data.next_max_id || null,
        hasNextPage: !!mediaResponse.data.next_max_id,
      };
      
      console.log(`Found ${mediaItems.length} total media items`);
      
      // Step 3: Filter only video content
      const videoItems = mediaItems.filter((item) => {
        return (
          item.is_video === true ||
          item.media_type === 2 || // Instagram API: 2 = video
          (item.video_versions && item.video_versions.length > 0)
        );
      });
      
      console.log(`Found ${videoItems.length} video items`);
      
      // Step 4: Format the video items to match the response format
      const reels = videoItems.map((item) => this.formatVideoItem(item, userId));
      
      return {
        nodes: reels,
        pageInfo: pageInfo,
      };
    } catch (error: any) {
      console.error("Error in fetchReelsWithAgent:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  }

  /**
   * Format a video item for the response
   */
  private formatVideoItem(item: InstagramMediaItem, defaultUserId: string) {
    const id = item.user?.pk || defaultUserId;
    const code = item.code || item.shortcode || '';
    
    const directVideoUrl =
      item.video_url ||
      (item.video_versions && item.video_versions[0]?.url) ||
      null;
    
    return {
      id,
      code,
      originalUrl: directVideoUrl,
    };
  }
}

// Export a singleton instance
export default new InstagramService();