import * as React from 'react';
import { ChatSidebar } from './ChatSidebar';

export const Dashboard: React.FC = () => {
    return (
        <div className="learning-os-dashboard">
            <header className="learning-os-dashboard-header">
                <h2>Learning OS Dashboard</h2>
                <div className="status-indicator">● Backend: Connected</div>
            </header>
            
            <div className="learning-os-dashboard-grid">
                <section className="dashboard-panel chat-panel">
                    <ChatSidebar />
                </section>
                
                <section className="dashboard-panel skills-panel">
                    <h3>Active Skills</h3>
                    <div className="skill-item">System Thinking <span>[Level 5]</span></div>
                    <div className="skill-item">Rapid Prototyping <span>[Level 3]</span></div>
                </section>
                
                <section className="dashboard-panel map-panel">
                    <h3>Knowledge Map</h3>
                    <div className="map-placeholder">Canvas View Available</div>
                </section>

                <section className="dashboard-panel settings-panel">
                    <h3>Quick Settings</h3>
                    <button className="settings-button">Manage Connections</button>
                </section>
            </div>
        </div>
    );
};
