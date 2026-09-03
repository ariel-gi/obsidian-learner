import { requestUrl, RequestUrlParam } from 'obsidian';
import { LearningOSSettings } from '../settings/defaultSettings';

class BackendClient {
    private settings: LearningOSSettings | null = null;

    updateConfig(settings: LearningOSSettings) {
        this.settings = settings;
    }

    private getHeaders() {
        if (!this.settings) throw new Error("Settings not loaded in backend client.");
        return {
            'Content-Type': 'application/json',
            'X-API-Key': this.settings.apiKey,
            'X-API-Base': this.settings.apiEndpoint
        };
    }

    async checkHealth(): Promise<boolean> {
        if (!this.settings?.pythonServerUrl) return false;
        
        try {
            const req: RequestUrlParam = {
                url: `${this.settings.pythonServerUrl}/health`,
                method: 'GET',
            };
            const response = await requestUrl(req);
            return response.status === 200;
        } catch (error) {
            console.error("LearningOS: Backend health check failed.", error);
            return false;
        }
    }

    // Example of future endpoints we will need
    async requestNewSkill(userPrompt: string): Promise<any> {
        if (!this.settings) throw new Error("Settings not loaded");
        
        const req: RequestUrlParam = {
            url: `${this.settings.pythonServerUrl}/skills/request_new`,
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ prompt: userPrompt })
        };

        const response = await requestUrl(req);
        return response.json;
    }
}

export const backendClient = new BackendClient();