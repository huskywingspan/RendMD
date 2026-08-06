import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Chrome state.
 *
 * Split from settings because most of this is transient — which overlay is
 * open right now is nobody's preference. The few things worth remembering
 * (rail width, which panel you had open, whether you work in focus mode) are
 * listed in `partialize` and nothing else is written to disk.
 */

export type RailPanel = 'files' | 'outline';
export type ViewMode = 'read' | 'source' | 'split';
export type Overlay = 'palette' | 'settings' | 'shortcuts' | 'image' | null;

interface UIState {
  railOpen: boolean;
  railPanel: RailPanel;
  railWidth: number;
  viewMode: ViewMode;
  /** Hides all chrome and centres the document. */
  focusMode: boolean;
  overlay: Overlay;
  findOpen: boolean;
  findReplaceMode: boolean;
  /**
   * Bumped by every openFind call, including while the bar is already up.
   *
   * Ctrl+F on an open search bar used to be a no-op, which reads as the
   * shortcut being broken. The bar watches this counter and re-focuses its
   * input when it changes, so pressing it again does the useful thing.
   */
  findNonce: number;
  /** Viewport is narrow enough that the rail becomes a drawer. */
  isCompact: boolean;

  toggleRail: () => void;
  setRailOpen: (open: boolean) => void;
  setRailPanel: (panel: RailPanel) => void;
  showRailPanel: (panel: RailPanel) => void;
  setRailWidth: (width: number) => void;
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;
  toggleFocusMode: () => void;
  openOverlay: (overlay: Exclude<Overlay, null>) => void;
  closeOverlay: () => void;
  toggleOverlay: (overlay: Exclude<Overlay, null>) => void;
  openFind: (replace?: boolean) => void;
  closeFind: () => void;
  setCompact: (compact: boolean) => void;
}

export const MIN_RAIL_WIDTH = 180;
export const MAX_RAIL_WIDTH = 480;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      railOpen: true,
      railPanel: 'files',
      railWidth: 260,
      viewMode: 'read',
      focusMode: false,
      overlay: null,
      findOpen: false,
      findNonce: 0,
      findReplaceMode: false,
      isCompact: false,

      toggleRail: () => set((state) => ({ railOpen: !state.railOpen })),
      setRailOpen: (railOpen) => set({ railOpen }),
      setRailPanel: (railPanel) => set({ railPanel }),

      // Clicking a rail icon should reveal that panel, not toggle the rail
      // shut when a different panel happens to be showing.
      showRailPanel: (panel) => {
        const { railOpen, railPanel } = get();
        if (railOpen && railPanel === panel) set({ railOpen: false });
        else set({ railOpen: true, railPanel: panel });
      },

      setRailWidth: (width) =>
        set({ railWidth: Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, Math.round(width))) }),

      setViewMode: (viewMode) => set({ viewMode }),
      cycleViewMode: () =>
        set((state) => {
          const order: ViewMode[] = ['read', 'split', 'source'];
          // Split is meaningless on a phone; skip straight to source.
          const modes = state.isCompact ? (['read', 'source'] as ViewMode[]) : order;
          const index = modes.indexOf(state.viewMode);
          return { viewMode: modes[(index + 1) % modes.length] };
        }),

      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),

      openOverlay: (overlay) => set({ overlay }),
      closeOverlay: () => set({ overlay: null }),
      toggleOverlay: (overlay) =>
        set((state) => ({ overlay: state.overlay === overlay ? null : overlay })),

      openFind: (replace = false) =>
        set((state) => ({
          findOpen: true,
          findReplaceMode: replace,
          findNonce: state.findNonce + 1,
        })),
      closeFind: () => set({ findOpen: false }),

      setCompact: (isCompact) =>
        set((state) => ({
          isCompact,
          // Split can't render usefully below the breakpoint.
          viewMode: isCompact && state.viewMode === 'split' ? 'read' : state.viewMode,
          // The rail is a drawer when compact; it should not start open.
          railOpen: isCompact ? false : state.railOpen,
        })),
    }),
    {
      name: 'rendmd:ui',
      version: 1,
      partialize: (state) => ({
        railPanel: state.railPanel,
        railWidth: state.railWidth,
        viewMode: state.viewMode,
        focusMode: state.focusMode,
      }),
    },
  ),
);
