import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import LearningOSPlugin from '../main';
import { backendClient } from '../api/backendClient';

export class LearningOSSettingTab extends PluginSettingTab {
	plugin: LearningOSPlugin;

	constructor(app: App, plugin: LearningOSPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

        containerEl.createEl('h2', {text: 'Learning OS Settings'});
        containerEl.createEl('p', {text: 'Configure the connection to the Python intelligence backend and your LLM endpoints.'});

		new Setting(containerEl)
			.setName('Python Backend Server URL')
			.setDesc('The local URL where your FastAPI server is running (default: http://localhost:8000)')
			.addText(text => text
				.setPlaceholder('http://localhost:8000')
				.setValue(this.plugin.settings.pythonServerUrl)
				.onChange(async (value) => {
					this.plugin.settings.pythonServerUrl = value;
					await this.plugin.saveSettings();
                    backendClient.updateConfig(this.plugin.settings);
				}));

        containerEl.createEl('h3', {text: 'LLM Configuration'});
        
        new Setting(containerEl)
            .setName('API Endpoint (OpenAI Compatible)')
            .setDesc('Useful for custom model pooling (like AIClient2API) or LiteLLM. Leave default for OpenAI.')
            .addText(text => text
                .setPlaceholder('https://api.openai.com/v1')
                .setValue(this.plugin.settings.apiEndpoint)
                .onChange(async (value) => {
                    this.plugin.settings.apiEndpoint = value;
                    await this.plugin.saveSettings();
                    backendClient.updateConfig(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('The API key for your chosen provider. This is securely sent via headers to your local Python backend.')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                    backendClient.updateConfig(this.plugin.settings);
                }))
            .components[0].inputEl.type = "password"; 

        new Setting(containerEl)
            .setName('Test Connection')
            .setDesc('Test if the Obsidian plugin can communicate with your Python backend.')
            .addButton(btn => btn
                .setButtonText('Test Connection')
                .setCta()
                .onClick(async () => {
                    btn.setButtonText('Testing...');
                    try {
                        const isConnected = await backendClient.checkHealth();
                        if (isConnected) {
                            new Notice('✅ Successfully connected to Learning OS Backend!');
                            btn.setButtonText('Connected');
                            setTimeout(() => btn.setButtonText('Test Connection'), 2000);
                        } else {
                            new Notice('❌ Failed to connect. Is the Python server running?');
                            btn.setButtonText('Test Connection');
                        }
                    } catch (e) {
                        new Notice('❌ Connection error.');
                        btn.setButtonText('Test Connection');
                    }
                }));
	}
}