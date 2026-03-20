import timers from 'node:timers/promises';
import { google } from 'googleapis';
import type { YouTubeVideo } from './types.ts';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export const getChannelInfo = async (channelUrl: string) => {
  let id = '';
  let handle: string | null = null;

  const urlObj = new URL(channelUrl);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);

  if (pathParts[0] === 'channel') {
    id = pathParts[1];
  } else if (
    pathParts[0].startsWith('@') ||
    pathParts[0] === 'c' ||
    pathParts[0] === 'user'
  ) {
    handle = pathParts[0].startsWith('@') ? pathParts[0] : `@${pathParts[1]}`;

    const res = await youtube.channels.list({
      forHandle: handle,
      part: ['id', 'contentDetails'],
    });

    const channel = res.data.items?.[0];
    if (!channel) {
      throw new Error(`Channel not found: ${channelUrl}`);
    }
    id = channel.id!;
    handle = channel.snippet?.customUrl || handle;
  } else {
    throw new Error(`Invalid channel URL format: ${channelUrl}`);
  }

  const channelResponse = await youtube.channels.list({
    id: [id],
    part: ['contentDetails', 'snippet'],
  });

  const title = channelResponse.data.items?.[0]?.snippet?.title || null;
  const uploadsPlaylistId =
    channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists
      ?.uploads || null;

  if (!uploadsPlaylistId) {
    throw new Error(`Uploads playlist not found for channel: ${id}`);
  }

  return { id, handle, title, uploadsPlaylistId };
};

export const getPlaylistVideos = async (
  playlistId: string,
  maxResults: number = 50,
  publishedAfter?: string,
) => {
  const videos: YouTubeVideo[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await youtube.playlistItems.list({
      playlistId,
      part: ['snippet', 'contentDetails'],
      maxResults: maxResults,
      pageToken: nextPageToken,
    });

    const items = response.data.items || [];

    if (items.length === 0) break;

    const videoIds = items
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean) as string[];

    if (videoIds.length > 0) {
      const statsResponse = await youtube.videos.list({
        id: videoIds,
        part: ['snippet', 'statistics'],
      });

      const videoMap = new Map(
        statsResponse.data.items?.map((v) => [v.id!, v]) || [],
      );

      for (const item of items) {
        const videoId = item.contentDetails?.videoId;
        const videoData = videoMap.get(videoId!);

        if (!videoData || !videoData.snippet) continue;

        const publishedAt = new Date(videoData.snippet.publishedAt!);

        if (publishedAfter && publishedAt <= new Date(publishedAfter)) {
          continue;
        }

        videos.push({
          id: videoId!,
          title: videoData.snippet.title || 'Untitled',
          publishedAt: videoData.snippet.publishedAt!,
          viewCount: Number(videoData.statistics?.viewCount) || 0,
          likeCount: Number(videoData.statistics?.likeCount) || 0,
          desc: videoData.snippet.description || '',
        });
      }
    }

    if (publishedAfter) break;

    nextPageToken = response.data.nextPageToken || undefined;

    if (nextPageToken) await timers.setTimeout(500);
  } while (nextPageToken);

  videos.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return videos;
};
