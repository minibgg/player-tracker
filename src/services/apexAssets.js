// Legend icons and banners. The API sends their URLs with every player
// lookup; they're remembered so a card can show a legend's icon even when
// that player's response didn't include it.
import { getStoredLegendAssets, setStoredLegendAssets } from "./storage";
import { legendKey } from "./apexApi";

let assets = null;
const load = () => {
  if (!assets) assets = getStoredLegendAssets();
  return assets;
};

// { name, icon, banner } or null
export const getLegendAssets = (name) => load()[legendKey(name)] || null;

export const rememberLegendAssets = (fresh = {}) => {
  const current = load();
  const changed = Object.entries(fresh).some(
    ([key, value]) => current[key]?.icon !== value.icon,
  );
  if (!changed) return;
  assets = { ...current, ...fresh };
  setStoredLegendAssets(assets);
};
