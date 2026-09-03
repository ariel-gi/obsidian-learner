import * as React from 'react';
import { useState } from 'react';

// Static placeholder components

const ChatTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '2px solid red', padding: '10px', boxSizing: 'border-box' }}>
        <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '10px' }}>
            <div style={{ backgroundColor: '#e0f7fa', padding: '8px', borderRadius: '5px', marginBottom: '5px', border: '1px solid #00bcd4', color: '#006064' }}>
                Hello! How can I help you learn today?
            </div>
            <div style={{ backgroundColor: '#c8e6c9', padding: '8px', borderRadius: '5px', marginBottom: '5px', border: '1px solid #4caf50', alignSelf: 'flex-end', color: '#1b5e20' }}>
                I need help with Calculus.
            </div>
            <div style={{ backgroundColor: '#e0f7fa', padding: '8px', borderRadius: '5px', marginBottom: '5px', border: '1px solid #00bcd4', color: '#006064' }}>
                Sure, what specifically about Calculus?
            </div>
        </div>
        <input 
            type="text" 
            placeholder="Type a message... (Disabled)" 
            disabled 
            style={{ width: '100%', padding: '10px', border: '2px solid orange', boxSizing: 'border-box', backgroundColor: '#fff3e0' }} 
        />
    </div>
);

const PreferencesTab = () => (
    <div style={{ border: '2px solid green', padding: '10px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'green' }}>Learning Preferences</h3>
        {[
            'Socratic Mode',
            'Metaphor Engine',
            'Visual Bias',
            'Spaced Repetition Integration',
            'Feynman Technique Evaluator'
        ].map(pref => (
            <div key={pref} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '5px', border: '1px dashed darkgreen', backgroundColor: '#f1f8e9' }}>
                <span style={{ color: '#336600', fontWeight: 'bold' }}>{pref}</span>
                <input type="checkbox" style={{ transform: 'scale(1.5)', cursor: 'not-allowed' }} disabled />
            </div>
        ))}
    </div>
);

const UploadTab = () => (
    <div style={{ border: '2px solid blue', padding: '10px', boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'blue' }}>Upload Materials</h3>
        <div style={{ 
            border: '4px dashed #2196f3', 
            borderRadius: '10px', 
            padding: '40px', 
            textAlign: 'center', 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: '#e3f2fd'
        }}>
            <span style={{ fontSize: '30px', color: '#1976d2' }}>📁</span>
            <p style={{ color: '#0d47a1', fontWeight: 'bold' }}>Drag & Drop Files Here</p>
            <button disabled style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'not-allowed', marginTop: '10px' }}>
                Mock Upload Button
            </button>
        </div>
    </div>
);

const SkillsTab = () => (
    <div style={{ border: '2px solid purple', padding: '10px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 10px 0', color: 'purple' }}>Agentic Skills</h3>
        {[
            { name: 'Visual Math Models', status: 'Unrefined', stars: '⭐☆☆☆☆' },
            { name: 'Historical Timeline Generator', status: 'Mastered', stars: '⭐⭐⭐⭐⭐' },
            { name: 'Code Snippet Explainer', status: 'Refining', stars: '⭐⭐⭐☆☆' }
        ].map(skill => (
            <div key={skill.name} style={{ border: '2px solid #ce93d8', padding: '10px', marginBottom: '10px', borderRadius: '5px', backgroundColor: '#f3e5f5' }}>
                <h4 style={{ margin: '0 0 5px 0', color: '#4a148c' }}>{skill.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        backgroundColor: skill.status === 'Mastered' ? '#4caf50' : skill.status === 'Unrefined' ? '#ff9800' : '#2196f3',
                        color: 'white'
                    }}>
                        {skill.status}
                    </span>
                    <span style={{ color: '#fbc02d', textShadow: '1px 1px 1px #ccc' }}>{skill.stars}</span>
                </div>
            </div>
        ))}
    </div>
);


export const App = () => {
    const [activeTab, setActiveTab] = useState<'chat' | 'prefs' | 'upload' | 'skills'>('chat');

    const tabs = [
        { id: 'chat', label: 'Chat', color: 'red' },
        { id: 'prefs', label: 'Preferences', color: 'green' },
        { id: 'upload', label: 'Upload', color: 'blue' },
        { id: 'skills', label: 'Skills', color: 'purple' }
    ] as const;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '4px solid black', padding: '5px', boxSizing: 'border-box', backgroundColor: 'white' }}>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '2px solid black', marginBottom: '10px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '10px 5px',
                            cursor: 'pointer',
                            backgroundColor: activeTab === tab.id ? tab.color : '#e0e0e0',
                            color: activeTab === tab.id ? 'white' : 'black',
                            border: `2px solid ${tab.color}`,
                            borderBottom: 'none',
                            fontWeight: 'bold',
                            borderTopLeftRadius: '5px',
                            borderTopRightRadius: '5px',
                            marginRight: '2px'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {activeTab === 'chat' && <ChatTab />}
                {activeTab === 'prefs' && <PreferencesTab />}
                {activeTab === 'upload' && <UploadTab />}
                {activeTab === 'skills' && <SkillsTab />}
            </div>
        </div>
    );
};
