import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ChatSidebar } from './ChatSidebar';

export const VIEW_TYPE_LEARNING_OS_CHAT = "learning-os-chat-view";

export class ChatSidebarView extends ItemView {
    private reactRoot: HTMLElement;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_LEARNING_OS_CHAT;
    }

    getDisplayText(): string {
        return "Learning OS Preferences";
    }

    getIcon(): string {
        return "bot";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        
        this.reactRoot = container.createDiv({ cls: 'learning-os-react-root' });
        
        // Render the React Component into the Obsidian ItemView
        ReactDOM.render(<ChatSidebar />, this.reactRoot);
    }

    async onClose() {
        if (this.reactRoot) {
            ReactDOM.unmountComponentAtNode(this.reactRoot);
        }
    }
}
