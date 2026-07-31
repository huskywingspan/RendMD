/**
 * Browser quirks that change what RendMD can offer.
 *
 * Deliberately not user-agent sniffing. The one case here is Brave, which
 * exposes `navigator.brave.isBrave()` precisely so sites can identify it
 * without parsing a UA string — and which needs identifying because it is the
 * one Chromium browser where "this is Chromium" does not imply the File System
 * Access API exists.
 */

interface BraveNavigator extends Navigator {
  brave?: { isBrave: () => Promise<boolean> };
}

/**
 * Brave blocks the File System Access API by default, listing it among its
 * deviations from Chromium. Users can turn it back on at brave://flags, but
 * nothing in the API surface says so — feature detection alone would have us
 * tell a Brave user to go and install Chrome, which is both unhelpful and
 * wrong.
 */
export async function detectBrave(): Promise<boolean> {
  const nav = navigator as BraveNavigator;
  if (!nav.brave?.isBrave) return false;

  try {
    return await nav.brave.isBrave();
  } catch {
    return false;
  }
}
