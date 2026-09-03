import { Plugin, WorkspaceLeaf, ItemView } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App } from './ui/App';

export const VIEW_TYPE_LEARNING_OS = 'learning-os-view';

class LearningOSView extends ItemView {
    root: Root | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_LEARNING_OS;
    }

    getDisplayText(): string {
        return 'Learning OS';
    }

    getIcon(): string {
        return 'brain';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        
        // Ensure container has basic styling so it's not hidden
        (container as HTMLElement).style.height = '100%';
        (container as HTMLElement).style.padding = '10px';
        (container as HTMLElement).style.overflowY = 'auto';

        this.root = createRoot(container);
        this.root.render(React.createElement(App));
    }

    async onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}

export default class LearningOSPlugin extends Plugin {
    async onload(): Promise<void> {
        this.registerView(
            VIEW_TYPE_LEARNING_OS,
            (leaf) => new LearningOSView(leaf)
        );

        this.addRibbonIcon('brain', 'Toggle Learning OS', () => {
            this.toggleView();
        });
    }

    async toggleView(): Promise<void> {
        const { workspace } = this.app;
        
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_LEARNING_OS)[0];
        
        if (leaf) {
            workspace.revealLeaf(leaf);
        } else {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                await rightLeaf.setViewState({
                    type: VIEW_TYPE_LEARNING_OS,
                    active: true,
                });
                workspace.revealLeaf(rightLeaf);
            }
        }
    }

    onunload(): void {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_LEARNING_OS);
    }
}
