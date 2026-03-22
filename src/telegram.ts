import timers from 'node:timers/promises';
import { escapeMarkdownV2, formatDateTime } from './utils.ts';
import type { Video } from './types.ts';

export const formatMessage = (template: string, video: Video) =>
  template
    .replaceAll('{title}', escapeMarkdownV2(video.title))
    .replaceAll('{publishedAt}', formatDateTime(new Date(video.publishedAt)))
    .replaceAll('{viewCount}', video.viewCount.toString())
    .replaceAll('{likeCount}', video.likeCount.toString())
    .replaceAll('{link}', `https://youtu\\.be/${video.id}`);

export const sendTelegramMessage = async (
  botToken: string,
  chatId: string,
  message: string,
) => {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false,
      }),
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }
};

export const sendToChannelWithDelay = async (
  botToken: string,
  chatId: string,
  messages: string[],
  delayMs: number = 10_000,
) => {
  for (let i = 0; i < messages.length; i++) {
    await sendTelegramMessage(botToken, chatId, messages[i]);
    if (i < messages.length - 1) await timers.setTimeout(delayMs);
  }
};
