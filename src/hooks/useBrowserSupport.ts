import { useEffect, useState } from 'react';
import { supportsDirectoryPicker, supportsFileSystemAccess } from '@/lib/fs';
import { detectBrave } from '@/lib/browser';

export interface BrowserSupport {
  /** Can open files and write back to them. */
  canWriteFiles: boolean;
  /** Can open a whole folder as a workspace. */
  canOpenFolders: boolean;
  /**
   * Brave, which has the capability but ships it disabled. Worth telling the
   * user apart from Firefox and Safari, where the answer is "use another
   * browser" rather than "flip one setting".
   */
  isBrave: boolean;
}

/**
 * What this browser will let RendMD do.
 *
 * The capability checks are synchronous; the Brave check is not, so it starts
 * false and resolves a moment later. Callers only use it to choose *which*
 * explanation to show, never whether to show one, so the transition is
 * invisible.
 */
export function useBrowserSupport(): BrowserSupport {
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void detectBrave().then((brave) => {
      if (!cancelled) setIsBrave(brave);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    canWriteFiles: supportsFileSystemAccess,
    canOpenFolders: supportsDirectoryPicker,
    isBrave,
  };
}
