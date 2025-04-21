// @ts-nocheck
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { proxyService } from './proxy.service';
import { 
  InstaReelsResponse, 
  InstagramMediaItem, 
  InstagramMediaResponse,
  ProxyTestResult,
  SessionData
} from '../types/index';

/**
 * Enhanced Instagram service with browser fingerprinting, 
 * cookie management, and multiple endpoint strategies
 */
class InstagramService {
  // Store sessions by proxy
  private proxySessions: Map<string, SessionData> = new Map();
  
  // Browser-like headers with fingerprinting
  private getBrowserHeaders(extraHeaders = {}): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'X-IG-App-ID': '936619743392459',
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com',
      'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'X-Requested-With': 'XMLHttpRequest',
      'Priority': 'u=1, i',
      'DNT': '1',
      ...extraHeaders
    };
  }

  // Base API URLs to try
  private readonly apiUrls = {
    mainApi: 'https://i.instagram.com/api/v1',
    webApi: 'https://www.instagram.com',
    graphApi: 'https://graph.instagram.com'
  };
  
  private readonly mediaCount = 50;
  private readonly requestTimeout = 20000;  // 20 seconds
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000;
  private readonly useSessionCookies = true;
  
  // Different methods to try getting user info
  private readonly userInfoEndpoints = [
    // Method 1: v1 API endpoint
    (username: string) => `${this.apiUrls.mainApi}/users/web_profile_info/?username=${username}`,
    // Method 2: Web __a=1 endpoint
    (username: string) => `${this.apiUrls.webApi}/${username}/?__a=1&__d=1`,
    // Method 3: GraphQL endpoint
    (username: string) => `${this.apiUrls.webApi}/graphql/query/?query_hash=c9100bf9110dd6361671f113dd02e7d6&variables={"username":"${username}","include_reel":true,"include_suggested_users":false,"include_logged_out_extras":false,"include_highlight_reels":false}`,
  ];

  /**
   * Test all configured proxies
   */
  public async testProxies(): Promise<ProxyTestResult[]> {
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
    
    // Try different strategies in order
    const errors: Error[] = [];
    
    while (attemptCount < maxAttempts) {
      try {
        // Try with proxy first
        if (attemptCount < this.maxRetries) {
          const proxyInfo = proxyService.getNextProxy();
          
          if (proxyInfo) {
            console.log(`Attempt ${attemptCount + 1}: Using proxy #${proxyInfo.index + 1}`);
            
            try {
              // Try with proxy and session cookies
              if (this.useSessionCookies) {
                const proxyKey = `${proxyInfo.config.host}:${proxyInfo.config.port}`;
                let session = this.proxySessions.get(proxyKey);
                
                // If no session exists or it's old, create a new one
                if (!session || (new Date().getTime() - session.lastUsed.getTime() > 30 * 60 * 1000)) {
                  session = await this.createSession(proxyInfo.agent);
                  if (session) {
                    this.proxySessions.set(proxyKey, session);
                  }
                }
                
                if (session) {
                  // Try with session cookies
                  try {
                    const result = await this.fetchReelsWithAgent(
                      username, 
                      cursor, 
                      proxyInfo.agent, 
                      { Cookie: session.cookies, 'X-CSRFToken': session.csrfToken }
                    );
                    proxyService.markProxyAsSuccessful(proxyInfo.index);
                    return result;
                  } catch (sessionError) {
                    console.error('Session fetch failed, trying without session:', sessionError instanceof Error ? sessionError.message : 'Unknown error');
                  }
                }
              }
              
              // Try with proxy but no session
              const result = await this.fetchReelsWithAgent(username, cursor, proxyInfo.agent);
              proxyService.markProxyAsSuccessful(proxyInfo.index);
              return result;
            } catch (proxyError) {
              // If this proxy fails, mark it as failed and try the next one
              proxyService.markProxyAsFailed(proxyInfo.index);
              console.error(`Proxy attempt failed:`, proxyError instanceof Error ? proxyError.message : 'Unknown error');
              errors.push(proxyError instanceof Error ? proxyError : new Error('Unknown proxy error'));
              attemptCount++;
              await this.delayWithBackoff(attemptCount);
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
        errors.push(error instanceof Error ? error : new Error('Unknown error'));
        
        if (attemptCount >= maxAttempts) {
          console.error("All attempts failed.");
          
          // Provide detailed error information
          const errorMessage = `Failed after ${maxAttempts} attempts. Last error: ${error instanceof Error ? error.message : 'Unknown error'}. Previous errors: ${errors.map(e => e.message).join('; ')}`;
          throw new Error(errorMessage);
        }
        
        console.error(`Attempt ${attemptCount} failed:`, error instanceof Error ? error.message : 'Unknown error');
        await this.delayWithBackoff(attemptCount);
      }
    }
    
    throw new Error("Failed to fetch Instagram reels after multiple attempts");
  }

  /**
   * Create a new Instagram session with cookies
   */
  private async createSession(agent: HttpsProxyAgent<string> | null): Promise<SessionData | null> {
    try {
      console.log('Creating new Instagram session');
      
      // Create a cookie jar
      const cookieJar = new CookieJar();
      const client = wrapper(axios.create({
        jar: cookieJar,
        httpsAgent: agent,
        timeout: this.requestTimeout,
        headers: this.getBrowserHeaders()
      }));
      
      // First, visit Instagram to get initial cookies and CSRF token
      const response = await client.get('https://www.instagram.com/');
      
      // Extract the CSRF token
      const html = response.data;
      let csrfToken = '';
      
      // Extract CSRF token from response
      const csrfMatch = html.match(/"csrf_token":"([^"]+)"/);
      if (csrfMatch && csrfMatch[1]) {
        csrfToken = csrfMatch[1];
      }
      
      // Get cookies as string
      const cookieStrings: string[] = [];
      const cookies = await cookieJar.getCookies('https://www.instagram.com/');
      
      cookies.forEach(cookie => {
        cookieStrings.push(`${cookie.key}=${cookie.value}`);
      });
      
      const cookieString = cookieStrings.join('; ');
      
      console.log(`Session created with ${cookies.length} cookies`);
      return {
        cookies: cookieString,
        csrfToken,
        lastUsed: new Date()
      };
    } catch (error) {
      console.error('Failed to create Instagram session:', error);
      return null;
    }
  }

  /**
   * Internal method to fetch reels with a specific agent
   */
  private async fetchReelsWithAgent(
    username: string, 
    cursor: string | null, 
    agent: HttpsProxyAgent<string> | null,
    extraHeaders = {}
  ): Promise<InstaReelsResponse> {
    try {
      // Create a reusable axios instance with the agent
      const axiosInstance = axios.create({
        timeout: this.requestTimeout,
        httpsAgent: agent,
        headers: this.getBrowserHeaders(extraHeaders)
      });
      
      // Step 1: Try different methods to get user information
      const user = await this.getUserInfoWithFallback(username, axiosInstance);
      
      // Step 2: Get the user's media
      const mediaItems = await this.fetchUserMedia(user.id, cursor, axiosInstance);
      
      // Step 3: Filter and format video content
      const videoItems = this.filterVideoContent(mediaItems.items);
      
      // Step 4: Create pagination info
      const pageInfo = {
        cursor: mediaItems.next_max_id || null,
        hasNextPage: !!mediaItems.next_max_id,
      };
      
      // Step 5: Format the video items to match the response format
      const reels = videoItems.map((item) => this.formatVideoItem(item, user.id));
      
      return {
        nodes: reels,
        pageInfo: pageInfo,
      };
    } catch (error: any) {
      console.error("Error in fetchReelsWithAgent:", error);
      throw error;
    }
  }

  /**
   * Try multiple strategies to get user info
   */
  private async getUserInfoWithFallback(username: string, axiosInstance: AxiosInstance): Promise<any> {
    let lastError: Error | null = null;
    
    // Try each endpoint strategy
    for (let i = 0; i < this.userInfoEndpoints.length; i++) {
      try {
        const endpoint = this.userInfoEndpoints[i](username);
        console.log(`Trying user info endpoint ${i+1}: ${endpoint}`);
        
        const response = await axiosInstance.get(endpoint);
        
        // Handle different response formats based on the endpoint
        if (i === 0) { // v1 API endpoint
          if (response.data?.data?.user) {
            const user = response.data.data.user;
            console.log(`Found user via method ${i+1}: ${user.username} (${user.id})`);
            
            if (user.is_private) {
              throw new Error("This Instagram account is private. Only public accounts are supported.");
            }
            
            return user;
          }
        } else if (i === 1) { // Web __a=1 endpoint
          if (response.data?.graphql?.user) {
            const user = response.data.graphql.user;
            console.log(`Found user via method ${i+1}: ${user.username} (${user.id})`);
            
            if (user.is_private) {
              throw new Error("This Instagram account is private. Only public accounts are supported.");
            }
            
            return {
              id: user.id,
              username: user.username,
              full_name: user.full_name,
              is_private: user.is_private
            };
          }
        } else if (i === 2) { // GraphQL endpoint
          if (response.data?.data?.user) {
            const user = response.data.data.user;
            console.log(`Found user via method ${i+1}: ${user.username} (${user.id})`);
            
            if (user.is_private) {
              throw new Error("This Instagram account is private. Only public accounts are supported.");
            }
            
            return {
              id: user.id,
              username: user.username,
              full_name: user.full_name,
              is_private: user.is_private
            };
          }
        }
        
        // If we got a response but couldn't parse it
        throw new Error(`User data not found in response format for method ${i+1}`);
        
      } catch (error) {
        console.error(`Method ${i+1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        lastError = error instanceof Error ? error : new Error('Unknown error in getUserInfoWithFallback');
        // Try the next method
      }
    }
    
    // If all methods failed
    if (lastError) {
      throw lastError;
    } else {
      throw new Error(`Instagram user '${username}' not found or not accessible`);
    }
  }

  /**
   * Fetch user media items with multiple strategies
   */
  private async fetchUserMedia(
    userId: string, 
    cursor: string | null, 
    axiosInstance: AxiosInstance
  ): Promise<InstagramMediaResponse> {
    // Try different media endpoints
    const endpoints = [
      // API v1 endpoint
      cursor
        ? `${this.apiUrls.mainApi}/feed/user/${userId}/?max_id=${cursor}&count=${this.mediaCount}`
        : `${this.apiUrls.mainApi}/feed/user/${userId}/?count=${this.mediaCount}`,
      
      // GraphQL endpoint
      `${this.apiUrls.webApi}/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={"id":"${userId}","first":${this.mediaCount}${cursor ? `,"after":"${cursor}"` : ''}}`
    ];
    
    let lastError: Error | null = null;
    
    // Try each endpoint
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const endpoint = endpoints[i];
        console.log(`Trying media endpoint ${i+1}: ${endpoint}`);
        
        const response = await axiosInstance.get(endpoint);
        
        if (i === 0) { // API v1 endpoint
          if (response.data?.items) {
            console.log(`Found ${response.data.items.length} media items via method ${i+1}`);
            return response.data;
          }
        } else if (i === 1) { // GraphQL endpoint
          if (response.data?.data?.user?.edge_owner_to_timeline_media) {
            const edges = response.data.data.user.edge_owner_to_timeline_media.edges || [];
            const pageInfo = response.data.data.user.edge_owner_to_timeline_media.page_info;
            
            // Convert from GraphQL format to v1 API format
            const items = edges.map((edge: any) => ({
              id: edge.node.id,
              code: edge.node.shortcode,
              media_type: edge.node.is_video ? 2 : 1,
              is_video: edge.node.is_video,
              video_url: edge.node.video_url,
              user: {
                pk: userId,
                username: '',
                full_name: ''
              }
            }));
            
            console.log(`Found ${items.length} media items via method ${i+1}`);
            
            return {
              items,
              num_results: items.length,
              more_available: pageInfo.has_next_page,
              next_max_id: pageInfo.end_cursor,
              status: 'ok'
            };
          }
        }
        
        // If we got a response but couldn't parse it
        throw new Error(`Media data not found in response format for method ${i+1}`);
        
      } catch (error) {
        console.error(`Media method ${i+1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        lastError = error instanceof Error ? error : new Error('Unknown error in fetchUserMedia');
        // Try the next method
      }
    }
    
    // If all methods failed
    if (lastError) {
      throw lastError;
    } else {
      throw new Error(`Failed to fetch media for user ID ${userId}`);
    }
  }

  /**
   * Filter only video content from media items
   */
  private filterVideoContent(mediaItems: InstagramMediaItem[]): InstagramMediaItem[] {
    const videoItems = mediaItems.filter((item) => {
      return (
        item.is_video === true ||
        item.media_type === 2 || // Instagram API: 2 = video
        (item.video_versions && item.video_versions.length > 0)
      );
    });
    
    console.log(`Found ${videoItems.length} video items out of ${mediaItems.length} total items`);
    return videoItems;
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

  /**
   * Exponential backoff delay
   */
  private async delayWithBackoff(attempt: number): Promise<void> {
    const baseDelay = this.retryDelay;
    // Exponential backoff with jitter
    const delay = Math.min(
      baseDelay * Math.pow(1.5, attempt) + Math.random() * 1000,
      30000 // Max 30 seconds
    );
    
    console.log(`Delaying for ${Math.round(delay)}ms before next attempt`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Export a singleton instance
export default new InstagramService();