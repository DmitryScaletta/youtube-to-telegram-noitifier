export type Config = {
  channelUrl: string;
  titleExcludedPhrases?: string[];
  triggers: {
    [id: string]: {
      tgChatId: string;
      keywordsInDesc: string[];
      messageTemplate: string;
    };
  };
}[];

export type YouTubeVideo = {
  id: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  desc: string;
};

export type Video = Omit<YouTubeVideo, 'desc'>;

export type ChannelCache = {
  id: string;
  title: string | null;
  handle: string | null;
  uploadsPlaylistId: string;
  videos: Video[];
  matchedIds: {
    [triggerId: string]: string[];
  };
};

export type Cache = {
  [channelUrl: string]: ChannelCache;
};

export type GistFiles = {
  'config.json'?: { content: string };
  'cache.json'?: { content: string };
  'README.md'?: { content: string };
};

export type GistResponse = {
  files: GistFiles;
  updated_at: string;
};
