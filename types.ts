export interface MapChunk {
  uri: string;
  title: string;
  placeId?: string;
}

export interface GroundingChunk {
  maps?: MapChunk;
}

export interface QAndA {
  question: string;
  answer: string;
}

export interface Review {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}

export interface OwnerInfo {
  message?: string;      // オーナーからのメッセージ
  posts?: string[];      // オーナーからの投稿
}

export interface SearchResult {
  title:string;
  uri: string;
  placeId?: string;
  photoUrl?: string;
  photoUrls?: string[];
  address?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  reviews?: string[];
  detailedReviews?: Review[];
  qanda?: QAndA[];
  // 新規追加フィールド
  website?: string;
  businessStatus?: string;
  priceLevel?: number;
  openingHours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  wheelchairAccessible?: boolean;
  ownerInfo?: OwnerInfo;
  description?: string; // AI生成された施設紹介文
}