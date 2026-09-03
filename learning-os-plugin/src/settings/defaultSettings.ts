export interface LearningOSSettings {
	pythonServerUrl: string;
	apiEndpoint: string;
	apiKey: string;
	activeSubjectPath: string;
}

export const DEFAULT_SETTINGS: LearningOSSettings = {
	pythonServerUrl: 'http://localhost:8000',
	apiEndpoint: 'https://api.openai.com/v1',
	apiKey: '',
	activeSubjectPath: ''
}
