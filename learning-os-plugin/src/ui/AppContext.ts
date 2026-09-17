import { createContext, useContext } from 'react';
import { App } from 'obsidian';

/**
 * React context that exposes the Obsidian App instance to every
 * component in the dashboard tree. Populated once in main.ts when
 * the view is mounted via createRoot().render(<LearningOSApp app={...} />).
 */
export const ObsidianAppContext = createContext<App | null>(null);

/** Typed hook — throws if used outside the provider. */
export function useObsidianApp(): App {
    const ctx = useContext(ObsidianAppContext);
    if (!ctx) throw new Error('useObsidianApp must be used inside ObsidianAppContext.Provider');
    return ctx;
}
