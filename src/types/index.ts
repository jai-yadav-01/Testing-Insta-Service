export interface MediaNode {
  id: string;
  code: string;
  originalUrl: string | null;
}

export interface PageInfo {
  cursor: string | null;
  hasNextPage: boolean;
}

export interface InstaReelsResponse {
  nodes: MediaNode[];
  pageInfo: PageInfo;
}

// Instagram API response types
export interface InstagramUserResponse {
  data: {
    user: {
      id: string;
      username: string;
      is_private: boolean;
    };
  };
}

export interface InstagramMediaItem {
  id?: string;
  code?: string;
  shortcode?: string;
  is_video?: boolean;
  media_type?: number;
  video_versions?: {
    url: string;
    width: number;
    height: number;
  }[];
  video_url?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  original_width?: number;
  original_height?: number;
  caption?: {
    text: string;
  };
  edge_media_to_caption?: {
    edges: {
      node: {
        text: string;
      };
    }[];
  };
  user?: {
    pk: string;
  };
}

export interface InstagramMediaResponse {
  items: InstagramMediaItem[];
  next_max_id?: string;
}