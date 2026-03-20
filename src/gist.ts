import type { GistFiles, GistResponse } from './types.ts';

const getGistId = (url: string) => {
  const parts = url.split('/');
  return parts[parts.length - 1];
};

export const fetchGist = async (gistUrl: string, gistToken: string) => {
  const gistId = getGistId(gistUrl);
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${gistToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch gist: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<GistResponse>;
};

export const updateGist = async (
  gistUrl: string,
  gistToken: string,
  files: GistFiles,
) => {
  const gistId = getGistId(gistUrl);
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${gistToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to update gist: ${response.status} ${response.statusText}`,
    );
  }
};
