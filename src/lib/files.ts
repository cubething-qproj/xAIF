/**
 * Opening and downloading xAIF files with browser-fs-access: the browser's
 * native file dialogs where the File System Access API exists (Chromium);
 * elsewhere (e.g. Firefox) a file input for opening and a plain download.
 */

import { fileOpen, fileSave } from 'browser-fs-access';

const OPTIONS = { description: 'xAIF', mimeTypes: ['application/json'], extensions: ['.json'] };
const cancelled = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export const files = {
  /** Asks for a file to open; null if cancelled. */
  async open(): Promise<File | null> {
    try {
      return await fileOpen(OPTIONS);
    } catch (err) {
      if (cancelled(err)) return null;
      throw err;
    }
  },

  /**
   * Downloads `json` as `name`, through the native save dialog where there
   * is one. Resolves to the name chosen in that dialog, or null if there was
   * no dialog or it was cancelled.
   */
  async download(name: string, json: unknown): Promise<string | null> {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    try {
      return (await fileSave(blob, { ...OPTIONS, fileName: name }))?.name ?? null;
    } catch (err) {
      if (cancelled(err)) return null;
      throw err;
    }
  },
};
