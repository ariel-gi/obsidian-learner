import * as React from 'react';
import { backendClient } from '../api/backendClient';

interface Message {
    id: string;
    role: 'user' | 'agent';
    content: string;
}

export const ChatSidebar: React.FC = () => {
    const [messages, setMessages] = React.useState<Message[]>([
        {
            id: '1',
            role: 'agent',
            content: 'Hello! I am your Learning OS preferences agent. What new skill or preference would you like to implement?'
        }
    ]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Simulate a response without calling the backend
        setTimeout(() => {
            const agentMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                content: "Thanks for your input! I'm just a prototype for now, but I'll soon be able to evolve your learning skills."
            };
            setMessages(prev => [...prev, agentMsg]);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="learning-os-chat-container">
            <div className="learning-os-chat-header">
                <h3>Preferences Agent</h3>
            </div>
            
            <div className="learning-os-chat-history">
                {messages.map(msg => (
                    <div key={msg.id} className={`learning-os-chat-msg ${msg.role}`}>
                        <strong>{msg.role === 'user' ? 'You' : 'OS'}</strong>
                        <p>{msg.content}</p>
                    </div>
                ))}
                {isLoading && (
                    <div className="learning-os-chat-msg agent">
                        <p><em>Thinking...</em></p>
                    </div>
                )}
            </div>

            <div className="learning-os-chat-input-area">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="e.g. Make my notes more visual..."
                />
                <button onClick={handleSend} disabled={isLoading}>
                    Send
                </button>
            </div>
        </div>
    );
};
