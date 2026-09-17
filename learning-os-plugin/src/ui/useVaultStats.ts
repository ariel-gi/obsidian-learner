import { useState, useEffect } from 'react';
import { TFile, TFolder, App } from 'obsidian';

export interface VaultStats {
    subjectName: string;       // Active subject folder name
    subjectPath: string;       // Full path
    noteCount: number;         // Total .md files in subject folder
    conceptCount: number;      // Notes whose frontmatter has a 'concepts' key, or all notes
    artifactCount: number;     // Notes inside an 'artifacts' subfolder
    backendConnected: boolean; // Result of /health check
}

const DEFAULT_STATS: VaultStats = {
    subjectName: 'No subject set',
    subjectPath: '',
    noteCount: 0,
    conceptCount: 0,
    artifactCount: 0,
    backendConnected: false,
};

/**
 * Reads real data from the Obsidian vault to populate the Home page stat cards.
 * Runs once on mount and whenever activeSubjectPath changes.
 */
export function useVaultStats(app: App, backendUrl: string): VaultStats {
    const [stats, setStats] = useState<VaultStats>(DEFAULT_STATS);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            // ── Read settings from plugin data ─────────────────────────────
            const pluginData: any = await (app as any).plugins.plugins['learning-os']?.loadData?.() ?? {};
            const subjectPath: string = pluginData?.activeSubjectPath ?? '';

            let subjectName = 'No subject set';
            let noteCount = 0;
            let conceptCount = 0;
            let artifactCount = 0;

            if (subjectPath) {
                const folder = app.vault.getAbstractFileByPath(subjectPath);
                if (folder instanceof TFolder) {
                    subjectName = folder.name;

                    // Count all markdown files recursively in the subject folder
                    app.vault.getAllLoadedFiles().forEach((f) => {
                        if (f instanceof TFile && f.extension === 'md' && f.path.startsWith(subjectPath + '/')) {
                            noteCount++;
                            // Count artifacts (files in an 'artifacts' subfolder)
                            if (f.path.toLowerCase().includes('/artifacts/')) {
                                artifactCount++;
                            }
                        }
                    });
                    conceptCount = noteCount - artifactCount;
                }
            } else {
                // No subject set — count total vault notes
                noteCount = app.vault.getAllLoadedFiles().filter(
                    (f) => f instanceof TFile && (f as TFile).extension === 'md'
                ).length;
                subjectName = 'All notes';
            }

            // ── Health check (non-blocking, short timeout) ──────────────────
            let backendConnected = false;
            try {
                const ctrl = new AbortController();
                const timeout = setTimeout(() => ctrl.abort(), 3000);
                const res = await fetch(`${backendUrl}/health`, { signal: ctrl.signal });
                clearTimeout(timeout);
                backendConnected = res.ok;
            } catch {
                backendConnected = false;
            }

            if (!cancelled) {
                setStats({ subjectName, subjectPath, noteCount, conceptCount, artifactCount, backendConnected });
            }
        }

        load();
        return () => { cancelled = true; };
    }, [app, backendUrl]);

    return stats;
}
