import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The unsupported-browser states.
 *
 * These matter more than they look: they are the only thing a user sees when
 * RendMD can't do the one thing it's for, and getting the message wrong sends
 * them to the wrong place. Brave shipped a real case of this — it blocks the
 * File System Access API behind a flag, so "install Chrome or Edge" is both
 * wrong and points away from the fix.
 *
 * Capability is read at module load, so each case re-imports with its own mock.
 */

const mockFs = (canUseFileSystem: boolean) => {
  vi.doMock('@/lib/fs', async () => {
    const actual = await vi.importActual<typeof import('@/lib/fs')>('@/lib/fs');
    return {
      ...actual,
      supportsFileSystemAccess: canUseFileSystem,
      supportsDirectoryPicker: canUseFileSystem,
    };
  });
};

const mockBrave = (isBrave: boolean) => {
  vi.doMock('@/lib/browser', () => ({ detectBrave: async () => isBrave }));
};

async function renderFileTree() {
  const { FileTree } = await import('../FileTree');
  const view = render(<FileTree />);
  // detectBrave resolves a microtask later.
  await screen.findByRole('heading', { level: 2 });
  return view;
}

beforeEach(() => {
  vi.resetModules();
});

describe('FileTree, when the browser cannot open folders', () => {
  it('tells a Brave user how to enable it, and does not blame Shields', async () => {
    mockFs(false);
    mockBrave(true);

    await renderFileTree();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Brave has this turned off');

    // The actionable part: where to go, and what to search for.
    expect(screen.getByText(/brave:\/\/flags/)).toBeInTheDocument();
    expect(screen.getByText(/Search for "File System"/)).toBeInTheDocument();
    expect(screen.getByText(/restart Brave/)).toBeInTheDocument();

    // Shields is a separate mechanism, and saying otherwise wastes the user's
    // time — this is the exact wrong turn the previous copy caused.
    expect(screen.getByText(/Shields doesn't affect it/)).toBeInTheDocument();

    // And it must not send a Brave user off to install another browser.
    expect(screen.queryByText(/Folders need Chrome or Edge/)).not.toBeInTheDocument();
  });

  it('tells a Firefox or Safari user to use Chromium, since no flag will help', async () => {
    mockFs(false);
    mockBrave(false);

    await renderFileTree();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Folders need Chrome or Edge',
    );
    expect(screen.queryByText(/brave:\/\/flags/)).not.toBeInTheDocument();
  });
});

describe('FileTree, when the browser can open folders', () => {
  it('offers to open one', async () => {
    mockFs(true);
    mockBrave(false);

    await renderFileTree();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('No folder open');
    expect(screen.getByRole('button', { name: 'Open folder' })).toBeInTheDocument();
  });
});
