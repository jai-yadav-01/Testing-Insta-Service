// Instagram API Response Types

// User profile info response
export interface InstagramUserResponse {
  data: {
    user: {
      id: string;
      username: string;
      full_name: string;
      is_private: boolean;
      profile_pic_url: string;
    };
    status: string;
  };
}

// Media response for user feed
export interface InstagramMediaResponse {
  items: InstagramMediaItem[];
  num_results: number;
  more_available: boolean;
  next_max_id?: string;
  status: string;
}

// Individual media item
export interface InstagramMediaItem {
  id: string;
  code?: string;
  shortcode?: string;
  media_type?: number; // 1 for image, 2 for video
  is_video?: boolean;
  video_url?: string;
  video_versions?: {
    type: number;
    width: number;
    height: number;
    url: string;
    id: string;
  }[];
  user?: {
    pk: string;
    username: string;
    full_name: string;
  };
}

// Our structured response format for reels
export interface InstaReelsResponse {
  nodes: {
    id: string;
    code: string;
    originalUrl: string | null;
  }[];
  pageInfo: {
    cursor: string | null;
    hasNextPage: boolean;
  };
}

// Proxy configuration
export interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  country?: string;
  city?: string;
  consecutiveFailures?: number;
  lastUsed?: Date;
  lastChecked?: Date;
  working?: boolean;
}

// Proxy test result
export interface ProxyTestResult {
  proxy: ProxyConfig;
  working: boolean;
  responseTime?: number;
}

// Session data structure
export interface SessionData {
  cookies: string;
  csrfToken: string;
  lastUsed: Date;
}