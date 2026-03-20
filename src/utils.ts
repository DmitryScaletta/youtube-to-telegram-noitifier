export const formatDateTime = (date: Date) =>
  date.toISOString().slice(0, 19).replace('T', ' ');

export const escapeMarkdownV2 = (text: string) => {
  const specialChars = '_*[]()~`>#+-=|{}.!';
  return text
    .split('')
    .map((char) => (specialChars.includes(char) ? `\\${char}` : char))
    .join('');
};
