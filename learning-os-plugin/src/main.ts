import { Plugin, WorkspaceLeaf, ItemView, App as ObsidianApp } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App as LearningOSApp } from './ui/App';
import { LearningOSSettingTab } from './settings/SettingsTab';
import { DEFAULT_SETTINGS, LearningOSSettings } from './settings/defaultSettings';
import { backendClient } from './api/backendClient';

export const VIEW_TYPE_LEARNING_OS = 'learning-os-dashboard';

// ─── Full-Page View ───────────────────────────────────────────────────────────
// Opens as a center-pane tab (like a note), not a sidebar panel.

class LearningOSDashboardView extends ItemView {
    private root: Root | null = null;
    private obsidianApp: ObsidianApp;

    constructor(leaf: WorkspaceLeaf, obsidianApp: ObsidianApp) {
        super(leaf);
        this.obsidianApp = obsidianApp;
    }

    getViewType(): string { return VIEW_TYPE_LEARNING_OS; }
    getDisplayText(): string { return 'Learning OS'; }
    getIcon(): string { return 'brain'; }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.style.padding = '0';
        container.style.overflow = 'hidden';

        this.root = createRoot(container);
        // Pass the Obsidian app instance into the React tree
        this.root.render(React.createElement(LearningOSApp, { app: this.obsidianApp }));
    }

    async onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}

// ─── Plugin Entry Point ───────────────────────────────────────────────────────

export default class LearningOSPlugin extends Plugin {
    settings: LearningOSSettings;

    async onload(): Promise<void> {
        // Load persisted settings
        await this.loadSettings();

        // Register the full-page dashboard view
        this.registerView(
            VIEW_TYPE_LEARNING_OS,
            (leaf) => new LearningOSDashboardView(leaf, this.app)
        );

        // ── Ribbon icon ──────────────────────────────────────────────────────
        // Clicking the brain icon opens the dashboard as a new center-pane tab.
        this.addRibbonIcon('brain', 'Open Learning OS Dashboard', async () => {
            await this.openDashboard();
        });

        // ── Command palette entry ────────────────────────────────────────────
        this.addCommand({
            id: 'open-learning-os-dashboard',
            name: 'Open Learning OS Dashboard',
            callback: () => this.openDashboard(),
        });

        // Register the settings tab (⚙️ Obsidian Settings → Community Plugins → Learning OS)
        this.addSettingTab(new LearningOSSettingTab(this.app, this));

        // Sync backendClient with loaded settings
        backendClient.updateConfig(this.settings);
    }

    /** Opens (or reveals) the dashboard in the main editor area as a tab. */
    async openDashboard(): Promise<void> {
        // Wrap in onLayoutReady — this is a no-op if the layout is already
        // initialized, but prevents issues if clicked very early on startup.
        this.app.workspace.onLayoutReady(async () => {
            const { workspace } = this.app;

            // If already open anywhere, just focus it
            const existing = workspace.getLeavesOfType(VIEW_TYPE_LEARNING_OS);
            if (existing.length > 0) {
                workspace.revealLeaf(existing[0]);
                return;
            }

            // Open as a new center-pane tab
            const leaf: WorkspaceLeaf = workspace.getLeaf('tab');
            await leaf.setViewState({ type: VIEW_TYPE_LEARNING_OS, active: true });
            workspace.revealLeaf(leaf);
        });
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        backendClient.updateConfig(this.settings);
    }

    onunload(): void {
        // Only clean up stale view types from older plugin versions.
        // Do NOT detach VIEW_TYPE_LEARNING_OS here — hot-reload and Obsidian
        // manage the active view's lifecycle. Detaching it ourselves causes the
        // tab to vanish on every hot-reload, requiring a vault switch to restore it.
        this.app.workspace.detachLeavesOfType('learning-os-chat-view');
        this.app.workspace.detachLeavesOfType('learning-os-view');
        this.app.workspace.detachLeavesOfType('learning-os-dashboard-view');
    }
}
