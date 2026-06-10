const DRIVE_FOLDER_ID_REGEX = /\/folders\/([a-zA-Z0-9_-]+)/;

export const normalizeDriveFolderUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  // Accept folder id directly.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw) && !raw.includes('/')) {
    return `https://drive.google.com/drive/folders/${raw}`;
  }

  // Accept regular folder URL and strip extra path/query noise.
  const match = raw.match(DRIVE_FOLDER_ID_REGEX);
  if (match?.[1]) {
    return `https://drive.google.com/drive/folders/${match[1]}`;
  }

  return null;
};

