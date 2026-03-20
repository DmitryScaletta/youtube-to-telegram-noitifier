import type { Config, Cache, YouTubeVideo, ChannelCache } from './types.ts';
import { fetchGist, updateGist } from './gist.ts';
import { getChannelInfo, getPlaylistVideos } from './youtube.ts';
import { formatMessage, sendToChannelWithDelay } from './telegram.ts';
import { escapeMarkdownV2, formatDateTime } from './utils.ts';

const checkKeywordsInDesc = (desc: string, keywords: string[]) => {
  const lowerDesc = desc.toLowerCase();
  return keywords.some((keyword) => lowerDesc.includes(keyword.toLowerCase()));
};

const generateReadme = (config: Config, cache: Cache) => {
  const getChannelTitle = (channelInfo: ChannelCache, channelUrl: string) =>
    channelInfo.title || channelInfo.handle || channelUrl;

  const lastUpdatedAt = formatDateTime(new Date());
  let md = `# YouTube to Telegram Notifier\n\n`;
  md += `Last Update: ${lastUpdatedAt}\n\n`;

  for (const { channelUrl, triggers } of config) {
    for (const { keywordsInDesc } of Object.values(triggers)) {
      const channelTitle = getChannelTitle(cache[channelUrl], channelUrl);
      const channelTitleHash = channelTitle.toLowerCase().replaceAll(' ', '-');
      md += ` - [${channelTitle}](#${channelTitleHash}) - ${keywordsInDesc.join(', ')}\n`;
    }
  }
  md += '\n';

  for (const { channelUrl, titleExcludedPhrases = [], triggers } of config) {
    const channelInfo = cache[channelUrl];
    if (!channelInfo || channelInfo.videos.length === 0) continue;

    const channelTitle = getChannelTitle(channelInfo, channelUrl);
    for (const [triggerId, { keywordsInDesc }] of Object.entries(triggers)) {
      const keywords = keywordsInDesc.join(', ');
      md += `## ${channelTitle}\n\n`;
      md += `Keywords: ${keywords}\n\n`;
      md += `| Title | PublishedAt | Views | Likes | ⬜ | Link |\n`;
      md += `| ----- | ----------- | ----- | ----- | - | ---- |\n`;

      const videos = channelInfo.videos;
      const matchedIds = channelInfo.matchedIds[triggerId] || [];

      for (const { id, title, publishedAt, viewCount, likeCount } of videos) {
        let titleStr = title;
        for (const phrase of titleExcludedPhrases) {
          titleStr = titleStr.replace(phrase, '');
        }
        titleStr = escapeMarkdownV2(titleStr);
        const publishedAtStr = formatDateTime(new Date(publishedAt));
        const match = matchedIds.includes(id);
        const matchStr = match ? '✔' : '❌';
        const link = `https://youtu.be/${id}`;
        md += `| ${titleStr} | ${publishedAtStr} | ${viewCount} | ${likeCount} | ${matchStr} | ${link} |\n`;
      }
    }
    md += '\n';
  }

  return md;
};

const main = async () => {
  const { TG_BOT_TOKEN, YOUTUBE_API_KEY, GIST_URL, GIST_TOKEN } = process.env;

  if (!TG_BOT_TOKEN || !YOUTUBE_API_KEY || !GIST_URL || !GIST_TOKEN) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  console.log('[gist] Fetching config.json and cache.json...');
  const [configContent, cacheContent] = await Promise.all([
    fetchGist(GIST_URL, 'config.json'),
    fetchGist(GIST_URL, 'cache.json'),
  ]);

  if (!configContent) {
    console.error('[error] No config.json found in gist, exiting.');
    process.exit(0);
  }

  const config: Config = JSON.parse(configContent);
  if (config.length === 0) {
    console.error('[error] Config is empty, exiting.');
    process.exit(0);
  }

  const cache: Cache = cacheContent ? JSON.parse(cacheContent) : {};

  // chatId -> messages[]
  const telegramQueue = new Map<string, string[]>();

  for (const { channelUrl, triggers } of config) {
    console.log(`[channel] ${channelUrl}`);
    let channelInfo = cache[channelUrl];

    if (!channelInfo) {
      console.log('Fetching channel info...');
      const { id, handle, title, uploadsPlaylistId } =
        await getChannelInfo(channelUrl);
      channelInfo = {
        id,
        title,
        handle,
        uploadsPlaylistId,
        videos: [],
        matchedIds: {},
      };
      cache[channelUrl] = channelInfo;
    }

    let videos: YouTubeVideo[] = [];

    if (channelInfo.videos.length === 0) {
      console.log('Fetching all videos...');
      videos = await getPlaylistVideos(channelInfo.uploadsPlaylistId);
    } else {
      const publishedAfter = channelInfo.videos[0].publishedAt;
      console.log(
        `Fetching videos after: ${formatDateTime(new Date(publishedAfter))}`,
      );
      videos = await getPlaylistVideos(
        channelInfo.uploadsPlaylistId,
        3,
        publishedAfter,
      );
    }

    console.log(`Found ${videos.length} new videos`);

    for (const video of videos) {
      for (const [triggerId, trigger] of Object.entries(triggers)) {
        const isMatch = checkKeywordsInDesc(video.desc, trigger.keywordsInDesc);

        if (isMatch) {
          if (!channelInfo.matchedIds[triggerId]) {
            channelInfo.matchedIds[triggerId] = [];
          }
          channelInfo.matchedIds[triggerId].push(video.id);
        }

        const nowMinus24h = new Date().getTime() - 24 * 60 * 60 * 1_000;
        if (new Date(video.publishedAt).getTime() < nowMinus24h || !isMatch) {
          continue;
        }

        console.log(`Match found: "${video.title}"`);

        const message = formatMessage(trigger.messageTemplate, video);
        if (!telegramQueue.has(trigger.tgChatId)) {
          telegramQueue.set(trigger.tgChatId, []);
        }
        telegramQueue.get(trigger.tgChatId)!.push(message);
      }
    }

    channelInfo.videos = [
      ...videos.map(({ desc, ...video }) => video),
      ...channelInfo.videos,
    ];
  }

  console.log('Sending messages to Telegram...');
  for (const [chatId, messages] of telegramQueue) {
    if (messages.length === 0) continue;
    console.log(`[telegram] Sending ${messages.length} messages`);
    await sendToChannelWithDelay(TG_BOT_TOKEN, chatId, messages, 10_000);
  }

  console.log('[gist]: Updating cache.json and README.md...');
  const readmeContent = generateReadme(config, cache);
  await updateGist(GIST_URL, GIST_TOKEN, {
    'README.md': { content: readmeContent },
    'cache.json': { content: JSON.stringify(cache, null, 2) },
  });

  console.log('Done!');
};

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
