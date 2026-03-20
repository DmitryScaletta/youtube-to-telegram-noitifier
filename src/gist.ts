import type { GistFiles } from './types.ts';

const parseGist = (url: string) => {
  const parts = url.split('/');
  return {
    id: parts[parts.length - 1],
    username: parts[parts.length - 2],
  };
};

export const fetchGist = async (gistUrl: string, filename: string) => {
  const gist = parseGist(gistUrl);
  const url = `https://gist.githubusercontent.com/${gist.username}/${gist.id}/raw/${filename}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch gist file ${filename}: ${res.status} ${res.statusText}`,
    );
  }
  return res.text();
};

export const updateGist = async (
  gistUrl: string,
  gistToken: string,
  files: GistFiles,
) => {
  const gist = parseGist(gistUrl);
  const response = await fetch(`https://api.github.com/gists/${gist.id}`, {
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
