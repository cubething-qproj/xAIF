/**
 * Opening and saving xAIF files with browser-fs-access: the browser's native
 * file dialogs where the File System Access API exists (Chromium), so Save
 * can write back to the file that was opened or saved as; elsewhere (e.g.
 * Firefox) a file input for opening and a download for saving.
 */

import { fileOpen, fileSave, supported } from 'browser-fs-access';

const OPTIONS = { description: 'xAIF', mimeTypes: ['application/json'], extensions: ['.json'] };
const cancelled = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export const files = {
  /** Whether native dialogs (and so saving back to a file) are available. */
  supported(): boolean {
    return supported;
  },

  /** Asks for a file to open; null if cancelled. The handle is set when native dialogs are available. */
  async open(): Promise<{ file: File; handle?: FileSystemFileHandle } | null> {
    try {
      const file = await fileOpen(OPTIONS);
      return { file, handle: file.handle };
    } catch (err) {
      if (cancelled(err)) return null;
      throw err;
    }
  },

  /**
   * Saves to `handle` if given, else asks where (native dialog) or downloads
   * as `name`. Resolves to the file written, null without native dialogs, or
   * undefined if the dialog was cancelled.
   */
  async save(name: string, json: unknown, handle?: FileSystemFileHandle): Promise<FileSystemFileHandle | null | undefined> {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    try {
      return await fileSave(blob, { ...OPTIONS, fileName: name }, handle ?? null);
    } catch (err) {
      if (cancelled(err)) return undefined;
      throw err;
    }
  },
};
