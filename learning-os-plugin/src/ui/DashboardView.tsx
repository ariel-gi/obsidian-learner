import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Dashboard } from './Dashboard';

export const VIEW_TYPE_LEARNING_OS_DASHBOARD = "learning-os-dashboard-view";

export class DashboardView extends ItemView {
    private reactRoot: HTMLElement;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_LEARNING_OS_DASHBOARD;
    }

    getDisplayText(): string {
        return "Learning OS Dashboard";
    }

    getIcon(): string {
        return "layout-dashboard";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        
        this.reactRoot = container.createDiv({ cls: 'learning-os-react-root' });
        
        // Render the React Component into the Obsidian ItemView
        const root = ReactDOM.createRoot(this.reactRoot);
        root.render(<Dashboard />);
    }

    async onClose() {
        if (this.reactRoot) {
            // Unmount using React 18+ syntax
            const root = ReactDOM.createRoot(this.reactRoot);
            root.unmount();
        }
    }
}
