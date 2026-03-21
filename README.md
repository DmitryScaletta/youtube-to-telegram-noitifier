# YouTube to Telegram Notifier

Automatically checks YouTube channels for new videos and sends notifications to Telegram chats when video descriptions contain specific keywords.

## Features

- 🔍 Monitors multiple YouTube channels
- 🎯 Triggers based on keywords in video descriptions
- 📬 Sends formatted messages to Telegram chats
- 💾 Uses GitHub Gist for persistent storage
- ⏱️ Runs on schedule via GitHub Actions
- 🚫 No database required

## Setup

### 1. Create GitHub Gist

Create a **secret gist** with `config.json`:

```json
[
  {
    "channelUrl": "https://www.youtube.com/@veritasium",
    "titleExcludedPhrases": ["#veritasium"],
    "triggers": {
      "sales": {
        "tgChatId": "-1001234567890",
        "keywordsInDesc": ["sponsor", "discount"],
        "messageTemplate": "🎬 {title}\n\n📅 {publishedAt}\n👁️ {viewCount} views\n❤️ {likeCount} likes\n\n{link}"
      }
    }
  }
]
```

### 2. Get Required Tokens

| Token             | How to Get                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| `TG_BOT_TOKEN`    | Create bot via [@BotFather](https://t.me/botfather)                                   |
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → Enable YouTube Data API v3 |
| `GIST_TOKEN`      | [GitHub Settings](https://github.com/settings/tokens) → Scope: `gist`                 |
| `GIST_URL`        | Your secret gist URL                                                                  |

### 3. Configure GitHub Secrets

In your repository: **Settings → Secrets → Actions**

Add these secrets:

- `TG_BOT_TOKEN`
- `YOUTUBE_API_KEY`
- `GIST_URL`
- `GIST_TOKEN`

### 4. Deploy

```bash
git clone <your-repo>
pnpm install
```

Push to GitHub - the workflow runs automatically every hour.

## Message Variables

| Variable        | Description  |
| --------------- | ------------ |
| `{title}`       | Video title  |
| `{publishedAt}` | Publish date |
| `{viewCount}`   | View count   |
| `{likeCount}`   | Like count   |
| `{link}`        | Video URL    |
