import { useState, useRef, useEffect, useCallback } from 'react';
import { App as ObsidianApp, TFile, TFolder, normalizePath } from 'obsidian';
import { ObsidianAppContext, useObsidianApp } from './AppContext';
import { GeneratePage } from './GeneratePage';
import { ResourceUploader } from './ResourceUploader';

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = 'home' | 'chat' | 'skills' | 'map' | 'subjects' | 'settings' | 'generate';

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const Icons = {
    home:     "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    skills:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    map:      "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16",
    subjects: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    generate: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    check:    "M20 6L9 17l-5-5",
    star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    plus:     "M12 5v14 M5 12h14",
    feynman:  "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    brain:    "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.96-4.02A2.5 2.5 0 0 1 9.5 2z M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.96-4.02A2.5 2.5 0 0 0 14.5 2z",
    send:     "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
    folder:   "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
    file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
    trash:    "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    chevronR: "M9 18l6-6-6-6",
    chevronD: "M6 9l6 6 6-6",
    sparkle:  "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z M5 3v4 M3 5h4 M19 17v4 M17 19h4",
    copy:     "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.912 4.895 3 6 3h8c1.105 0 2 .912 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.088 19.105 22 18 22h-8c-1.105 0-2-.912-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
    xCircle:  "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M15 9l-6 6 M9 9l6 6",
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const accentColor = 'var(--interactive-accent)';
const bgPrimary   = 'var(--background-primary)';
const bgSecondary = 'var(--background-secondary)';
const bgTertiary  = 'var(--background-secondary-alt)';
const border      = 'var(--background-modifier-border)';
const textNormal  = 'var(--text-normal)';
const textMuted   = 'var(--text-muted)';
const textAccent  = 'var(--text-accent)';

const card: React.CSSProperties = {
    background: bgSecondary,
    border: `1px solid ${border}`,
    borderRadius: '10px',
    padding: '18px',
};

const pill = (color: string, bg: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
    fontWeight: 600, color, background: bg,
});

const btn = (primary = true): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '7px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', border: 'none',
    background: primary ? accentColor : bgTertiary,
    color: primary ? 'var(--text-on-accent)' : textNormal,
    transition: 'opacity 0.15s',
});

// ─── Page: Home ───────────────────────────────────────────────────────────────

const HomePage = ({ onNavigate }: { onNavigate: (p: Page) => void }) => {
    const app = useObsidianApp();
    const [topic, setTopic] = useState('');
    const [recentFiles, setRecentFiles] = useState<{ name: string; path: string; mtime: number }[]>([]);
    const [subjectName, setSubjectName] = useState('—');
    const [noteCount, setNoteCount] = useState(0);
    const [backendOk, setBackendOk] = useState<boolean | null>(null);

    // Load real vault data on mount
    useEffect(() => {
        // Get subject info from plugin settings
        const plugin = (app as any).plugins?.plugins?.['learning-os'];
        const settings = plugin?.settings ?? {};
        const subjectPath: string = settings.activeSubjectPath ?? '';

        // Count notes in active subject (or all vault notes)
        const allFiles = app.vault.getAllLoadedFiles();
        const mdFiles = allFiles.filter((f): f is TFile => f instanceof TFile && f.extension === 'md');

        let subjectFiles: TFile[] = mdFiles;
        if (subjectPath) {
            const folder = app.vault.getAbstractFileByPath(subjectPath);
            if (folder instanceof TFolder) {
                setSubjectName(folder.name);
                subjectFiles = mdFiles.filter(f => f.path.startsWith(subjectPath + '/'));
            } else {
                setSubjectName(subjectPath.split('/').pop() ?? subjectPath);
            }
        } else {
            setSubjectName('All notes');
        }
        setNoteCount(subjectFiles.length);

        // Recent files: 5 most recently modified
        const sorted = [...subjectFiles]
            .sort((a, b) => (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0))
            .slice(0, 5)
            .map(f => ({ name: f.name.replace(/\.md$/, ''), path: f.path, mtime: f.stat?.mtime ?? 0 }));
        setRecentFiles(sorted);

        // Backend health check (non-blocking)
        const url = settings.pythonServerUrl ?? 'http://localhost:8000';
        const ctrl = new AbortController();
        fetch(`${url}/health`, { signal: ctrl.signal })
            .then(r => setBackendOk(r.ok))
            .catch(() => setBackendOk(false));
        return () => ctrl.abort();
    }, [app]);

    const openFile = (path: string) => {
        const file = app.vault.getAbstractFileByPath(path);
        if (file) app.workspace.getLeaf('tab').openFile(file as any);
    };

    const timeAgo = (mtime: number) => {
        const diff = Date.now() - mtime;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const statCards = [
        {
            label: 'Active Subject',
            value: subjectName,
            sub: `${noteCount} notes in folder`,
            icon: Icons.subjects,
            color: '#7c6af7',
        },
        {
            label: 'Active Skills',
            value: '4 / 7',
            sub: 'Socratic, Metaphor +2',
            icon: Icons.skills,
            color: '#f97316',
        },
        {
            label: 'Backend Status',
            value: backendOk === null ? 'Checking…' : backendOk ? 'Connected' : 'Offline',
            sub: backendOk ? 'Ready to generate' : 'Start the Python server',
            icon: Icons.generate,
            color: backendOk ? '#22c55e' : backendOk === null ? '#f97316' : '#ef4444',
        },
        {
            label: 'Recent Notes',
            value: String(recentFiles.length),
            sub: recentFiles[0]?.name ?? 'No notes yet',
            icon: Icons.brain,
            color: '#38bdf8',
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', color: textNormal, fontWeight: 700 }}>
                        Learning OS
                    </h1>
                    <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '13px' }}>
                        Your personal AI learning environment
                    </p>
                </div>
                <span style={pill(
                    backendOk ? '#22c55e' : '#ef4444',
                    backendOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'
                )}>
                    ● Backend: {backendOk === null ? 'Checking…' : backendOk ? 'Connected' : 'Offline'}
                </span>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {statCards.map(s => (
                    <div key={s.label} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ color: textMuted, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {s.label}
                            </span>
                            <span style={{ color: s.color }}><Icon d={s.icon} size={16} /></span>
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: textNormal, margin: '8px 0 4px' }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: '12px', color: textMuted }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Quick Generate */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: textNormal }}>⚡ Quick Generate</h3>
                    <button onClick={() => onNavigate('generate')}
                        style={{ ...btn(false), padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>
                        Open full creator →
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Enter a topic to generate a learning artifact..."
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onNavigate('generate')}
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: '8px',
                            border: `1px solid ${border}`,
                            background: bgTertiary, color: textNormal, fontSize: '13px', outline: 'none',
                        }}
                    />
                    <button onClick={() => onNavigate('generate')} style={btn(true)}>
                        <Icon d={Icons.generate} size={14} /> Generate
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {['Derivatives', 'Integration', 'Chain Rule', "L'Hôpital's Rule"].map(t => (
                        <button key={t} onClick={() => { setTopic(t); onNavigate('generate'); }}
                            style={{ ...btn(false), padding: '4px 10px', fontSize: '12px', borderRadius: '20px' }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Notes */}
            <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: textNormal }}>📄 Recent Notes</h3>
                {recentFiles.length === 0 ? (
                    <div style={{ ...card, padding: '20px', textAlign: 'center', color: textMuted, fontSize: '13px' }}>
                        No notes found. Set your Active Subject Path in Settings, then add some notes.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {recentFiles.map(f => (
                            <div key={f.path} onClick={() => openFile(f.path)}
                                style={{ ...card, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted, flexShrink: 0 }}>
                                    <Icon d={Icons.file} size={14} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: textNormal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                    <div style={{ fontSize: '11px', color: textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</div>
                                </div>
                                <div style={{ fontSize: '11px', color: textMuted, flexShrink: 0 }}>{timeAgo(f.mtime)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Page: Chat ───────────────────────────────────────────────────────────────

interface ChatMsg { id: string; role: 'user' | 'agent'; content: string; }

const ChatPage = () => {
    const [messages, setMessages] = useState<ChatMsg[]>([
        { id: '1', role: 'agent', content: "Hello! I'm your Learning OS preferences agent. I can help you create new learning skills, adjust your pedagogy modes, or discuss your study strategy. What would you like to work on?" },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = () => {
        if (!input.trim()) return;
        const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(p => [...p, userMsg]);
        setInput('');
        setLoading(true);
        setTimeout(() => {
            setMessages(p => [...p, {
                id: (Date.now() + 1).toString(), role: 'agent',
                content: "I've received your request. Once the backend is connected, I'll spin up a Researcher agent and a Reasoner agent to build that skill for you. Stay tuned!"
            }]);
            setLoading(false);
        }, 1200);
    };

    const suggestions = [
        "Make my notes more visual",
        "Add interactive quizzes",
        "Enable Socratic mode",
        "Create a metaphor engine for basketball",
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: textNormal }}>🤖 Preferences Agent</h2>
                <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '13px' }}>
                    Chat with the AI to evolve your learning skills and preferences
                </p>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', ...card, minHeight: 0 }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '12px' }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ fontSize: '11px', color: textMuted, marginBottom: '4px', paddingLeft: msg.role === 'user' ? 0 : '4px' }}>
                                {msg.role === 'user' ? 'You' : '🧠 Learning OS'}
                            </div>
                            <div style={{
                                padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: msg.role === 'user' ? accentColor : bgTertiary,
                                color: msg.role === 'user' ? 'var(--text-on-accent)' : textNormal,
                                fontSize: '13px', lineHeight: '1.6', maxWidth: '85%',
                                border: msg.role === 'agent' ? `1px solid ${border}` : 'none',
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textMuted, fontSize: '13px' }}>
                            <span>🧠 Learning OS</span>
                            <span style={{ letterSpacing: '3px', animation: 'none' }}>●●●</span>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0' }}>
                    {suggestions.map(s => (
                        <button key={s} onClick={() => setInput(s)}
                            style={{ ...btn(false), padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${border}`, paddingTop: '12px' }}>
                    <input
                        type="text" value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && send()}
                        placeholder="e.g. Make my notes more visual..."
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: '8px',
                            border: `1px solid ${border}`, background: bgTertiary,
                            color: textNormal, fontSize: '13px', outline: 'none',
                        }}
                    />
                    <button onClick={send} disabled={loading} style={btn(true)}>
                        <Icon d={Icons.send} size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Page: Skills Lab ─────────────────────────────────────────────────────────

const SkillsPage = () => {
    const [skills, setSkills] = useState([
        { id: 'socratic',     name: 'Socratic Mode',              status: 'mastered',  active: true,  rating: 4.9, iterations: 24, desc: 'AI generates guiding questions instead of direct answers.' },
        { id: 'metaphor',     name: 'Metaphor Engine',            status: 'mastered',  active: true,  rating: 4.7, iterations: 18, desc: 'Maps abstract concepts to your personal hobbies and interests.' },
        { id: 'visual_bias',  name: 'Visual Bias',                status: 'mastered',  active: false, rating: 4.5, iterations: 12, desc: 'Forces Mermaid diagrams and charts over plain text.' },
        { id: 'spaced_rep',   name: 'Spaced Repetition',          status: 'mastered',  active: true,  rating: 4.6, iterations: 9,  desc: 'Auto-generates Anki-style flashcards at the bottom of notes.' },
        { id: 'feynman',      name: 'Feynman Evaluator',          status: 'unrefined', active: true,  rating: 3.2, iterations: 4,  desc: 'Interactive block where you explain the concept; AI grades your gaps.' },
        { id: 'visual_math',  name: 'Visual Math Models',         status: 'unrefined', active: false, rating: 2.8, iterations: 2,  desc: 'Generates interactive visual math diagrams using MathJax.' },
        { id: 'confidence',   name: 'Confidence Highlighting',    status: 'unrefined', active: false, rating: 0,   iterations: 0,  desc: 'Highlights text by confidence: source-verified vs AI-generated.' },
    ]);

    const toggle = (id: string) => setSkills(s => s.map(sk => sk.id === id ? { ...sk, active: !sk.active } : sk));

    const statusStyle = (st: string): React.CSSProperties => ({
        ...pill(
            st === 'mastered' ? '#22c55e' : st === 'unrefined' ? '#f97316' : '#38bdf8',
            st === 'mastered' ? 'rgba(34,197,94,0.15)' : st === 'unrefined' ? 'rgba(249,115,22,0.15)' : 'rgba(56,189,248,0.15)'
        ),
    });

    const stars = (r: number) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', color: textNormal }}>🧪 Skills Lab</h2>
                    <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '13px' }}>
                        Toggle and manage your AI learning skills. Request new ones via the Chat.
                    </p>
                </div>
                <button style={btn(true)}>
                    <Icon d={Icons.plus} size={14} /> Request New Skill
                </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span style={statusStyle('mastered')}>● Mastered</span>
                <span style={statusStyle('unrefined')}>● Unrefined</span>
                <span style={{ ...card, padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: textMuted }}>
                    {skills.filter(s => s.active).length} / {skills.length} active
                </span>
            </div>

            {/* Skills List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {skills.map(skill => (
                    <div key={skill.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px', opacity: skill.active ? 1 : 0.65 }}>
                        {/* Toggle */}
                        <button onClick={() => toggle(skill.id)} style={{
                            width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', flexShrink: 0,
                            background: skill.active ? accentColor : bgTertiary, position: 'relative', transition: 'background 0.2s',
                        }}>
                            <div style={{
                                position: 'absolute', top: '3px',
                                left: skill.active ? '21px' : '3px',
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: 'white', transition: 'left 0.2s',
                            }} />
                        </button>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: textNormal }}>{skill.name}</span>
                                <span style={statusStyle(skill.status)}>{skill.status}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {skill.desc}
                            </div>
                        </div>
                        {/* Rating */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ color: '#f59e0b', fontSize: '13px', letterSpacing: '1px' }}>{stars(skill.rating)}</div>
                            <div style={{ fontSize: '11px', color: textMuted }}>{skill.iterations} uses</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Banner */}
            <div style={{ ...card, background: 'rgba(124,106,247,0.08)', border: '1px solid rgba(124,106,247,0.3)', padding: '14px 16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: textNormal, lineHeight: '1.6' }}>
                    💡 <strong>How skills evolve:</strong> "Unrefined" skills collect your micro-feedback after each use.
                    Once they average &gt;4.5 stars over 3+ uses, they're automatically promoted to "Mastered" and stop asking for feedback.
                </p>
            </div>
        </div>
    );
};

// ─── Page: Progression Map ────────────────────────────────────────────────────

const MapPage = () => {
    const nodes = [
        { id: 'limits',      label: 'Limits',       mastery: 35, x: 200, y: 60  },
        { id: 'derivatives', label: 'Derivatives',   mastery: 80, x: 200, y: 200 },
        { id: 'chain',       label: 'Chain Rule',    mastery: 45, x: 80,  y: 340 },
        { id: 'product',     label: 'Product Rule',  mastery: 60, x: 320, y: 340 },
        { id: 'integrals',   label: 'Integrals',     mastery: 0,  x: 200, y: 480 },
    ];
    const edges = [
        { from: 'limits', to: 'derivatives' },
        { from: 'derivatives', to: 'chain' },
        { from: 'derivatives', to: 'product' },
        { from: 'chain', to: 'integrals' },
        { from: 'product', to: 'integrals' },
    ];
    const nodeById = (id: string) => nodes.find(n => n.id === id)!;
    const masteryColor = (m: number) =>
        m === 0 ? '#6b7280' : m < 40 ? '#ef4444' : m < 65 ? '#f97316' : m < 85 ? '#eab308' : '#22c55e';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', color: textNormal }}>🗺️ Progression Map</h2>
                    <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '13px' }}>
                        Visual topic map for your active subject · nodes colored by mastery level
                    </p>
                </div>
                <button style={btn(true)}>
                    <Icon d={Icons.generate} size={14} /> Regenerate Map
                </button>
            </div>

            {/* Canvas Preview */}
            <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: textNormal }}>Calculus · ProgressionMap.canvas</span>
                    <span style={pill(textMuted, bgTertiary)}>Preview</span>
                </div>
                <div style={{ position: 'relative', height: '560px', background: bgTertiary, overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                        {edges.map(e => {
                            const f = nodeById(e.from), t = nodeById(e.to);
                            return (
                                <line key={`${e.from}-${e.to}`}
                                    x1={f.x + 60} y1={f.y + 24} x2={t.x + 60} y2={t.y + 24}
                                    stroke={border} strokeWidth="2" strokeDasharray="4 4"
                                    markerEnd="url(#arrow)"
                                />
                            );
                        })}
                        <defs>
                            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L8,3 z" fill={textMuted} />
                            </marker>
                        </defs>
                    </svg>
                    {nodes.map(n => (
                        <div key={n.id} style={{
                            position: 'absolute', left: n.x, top: n.y,
                            width: '120px', textAlign: 'center',
                        }}>
                            <div style={{
                                borderRadius: '10px', padding: '10px 14px',
                                background: masteryColor(n.mastery) + '33',
                                border: `2px solid ${masteryColor(n.mastery)}`,
                                color: textNormal, fontSize: '13px', fontWeight: 600,
                            }}>
                                {n.label}
                                <div style={{ fontSize: '11px', color: masteryColor(n.mastery), marginTop: '4px' }}>
                                    {n.mastery === 0 ? 'Not started' : `${n.mastery}%`}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[['#6b7280','Not started'],['#ef4444','0–39%'],['#f97316','40–64%'],['#eab308','65–84%'],['#22c55e','85–100%']].map(([c, l]) => (
                    <span key={l} style={pill(c, c + '22')}>■ {l}</span>
                ))}
            </div>
        </div>
    );
};

// ─── Page: Subjects ───────────────────────────────────────────────────────────

/** Parse the _resource-index.md file and return a list of resource entries. */
function parseResourceIndex(markdown: string): { name: string; summary: string; added: string }[] {
    const entries: { name: string; summary: string; added: string }[] = [];
    // Each entry starts with "## <filename>"
    const blocks = markdown.split(/\n(?=## )/);
    for (const block of blocks) {
        const nameMatch    = block.match(/^## (.+)/m);
        const summaryMatch = block.match(/^\*\*Summary:\*\*\s*(.+)/m);
        const addedMatch   = block.match(/^\*\*Added:\*\*\s*(.+)/m);
        if (nameMatch) {
            entries.push({
                name:    nameMatch[1].trim(),
                summary: summaryMatch?.[1]?.trim() ?? '',
                added:   addedMatch?.[1]?.trim() ?? '',
            });
        }
    }
    return entries;
}

const SubjectsPage = () => {
    const app = useObsidianApp();

    // ── Live vault folders as subjects ────────────────────────────────────────
    const [subjects, setSubjects]           = useState<string[]>([]);
    const [activeSubject, setActiveSubject] = useState<string | null>(null);

    // ── Per-subject resource index ────────────────────────────────────────────
    const [resources, setResources] = useState<{ name: string; summary: string; added: string }[]>([]);
    const [indexLoading, setIndexLoading] = useState(false);

    // Load vault folders on mount
    useEffect(() => {
        const root = app.vault.getRoot();
        const folders = root.children
            .filter((f): f is TFolder => f instanceof TFolder && !f.name.startsWith('.'))
            .map(f => f.name)
            .sort();
        setSubjects(folders);
        if (folders.length > 0) setActiveSubject(folders[0]);
    }, [app]);

    // Load resource index whenever the active subject changes
    const loadResourceIndex = useCallback(async (subjectName: string) => {
        if (!subjectName) return;
        setIndexLoading(true);
        const indexPath = normalizePath(`${subjectName}/_resource-index.md`);
        try {
            const file = app.vault.getAbstractFileByPath(indexPath);
            if (file instanceof TFile) {
                const content = await app.vault.read(file);
                setResources(parseResourceIndex(content));
            } else {
                setResources([]);
            }
        } catch {
            setResources([]);
        } finally {
            setIndexLoading(false);
        }
    }, [app]);

    useEffect(() => {
        if (activeSubject) loadResourceIndex(activeSubject);
    }, [activeSubject, loadResourceIndex]);

    const handleIngested = (fileName: string) => {
        // Re-read the index after a successful ingest
        if (activeSubject) loadResourceIndex(activeSubject);
    };

    return (
        <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
            {/* Left: Subject List */}
            <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '16px', color: textNormal }}>📚 Subjects</h2>
                {subjects.length === 0 && (
                    <p style={{ fontSize: '12px', color: textMuted }}>
                        No subject folders found in vault.
                    </p>
                )}
                {subjects.map(name => (
                    <button key={name} onClick={() => setActiveSubject(name)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        width: '100%', justifyContent: 'flex-start', textAlign: 'left',
                        fontSize: '13px', fontWeight: activeSubject === name ? 600 : 400,
                        background: activeSubject === name ? accentColor : bgSecondary,
                        color: activeSubject === name ? 'var(--text-on-accent)' : textNormal,
                        border: `1px solid ${activeSubject === name ? accentColor : border}`,
                        transition: 'background 0.15s',
                    }}>
                        <Icon d={Icons.folder} size={14} />
                        {name}
                    </button>
                ))}
            </div>

            {/* Right: Subject Detail */}
            {activeSubject ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', color: textNormal }}>{activeSubject}</h2>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                            fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.15)',
                        }}>Active Subject</span>
                    </div>

                    {/* ── Resources Card ────────────────────────────────────── */}
                    <div style={{
                        background: bgSecondary,
                        border: `1px solid ${border}`,
                        borderRadius: '10px',
                        padding: '18px',
                    }}>
                        {/* Card header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h4 style={{ margin: 0, color: textNormal, fontSize: '14px' }}>
                                📎 Resources
                                <span style={{
                                    marginLeft: '8px', fontSize: '11px', fontWeight: 400,
                                    color: textMuted,
                                }}>
                                    {resources.length} file{resources.length !== 1 ? 's' : ''} indexed
                                </span>
                            </h4>
                            {/* Upload button lives here */}
                            <ResourceUploader
                                subjectName={activeSubject}
                                subjectPath={activeSubject}
                                onIngested={handleIngested}
                            />
                        </div>

                        {/* Resource list */}
                        {indexLoading ? (
                            <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>Loading…</p>
                        ) : resources.length === 0 ? (
                            <div style={{
                                padding: '20px', textAlign: 'center',
                                border: `1px dashed ${border}`, borderRadius: '8px',
                            }}>
                                <p style={{ margin: '0 0 4px', fontSize: '13px', color: textMuted }}>
                                    No resources yet.
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: textMuted }}>
                                    Click <strong>Add Resource</strong> to upload a PDF, image, or note.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {resources.map(r => (
                                    <div key={r.name} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                                        padding: '10px 12px', borderRadius: '7px',
                                        background: bgTertiary,
                                        border: `1px solid ${border}`,
                                    }}>
                                        <Icon d={Icons.file} size={16} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: textNormal, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {r.name}
                                            </div>
                                            {r.summary && (
                                                <div style={{ fontSize: '11px', color: textMuted, marginTop: '2px', lineHeight: 1.5 }}>
                                                    {r.summary}
                                                </div>
                                            )}
                                        </div>
                                        {r.added && (
                                            <div style={{ fontSize: '10px', color: textMuted, flexShrink: 0, paddingTop: '2px' }}>
                                                {r.added}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '7px', fontSize: '13px',
                            fontWeight: 600, cursor: 'pointer', border: 'none',
                            background: accentColor, color: 'var(--text-on-accent)',
                        }}>
                            <Icon d={Icons.map} size={14} /> Open Canvas Map
                        </button>
                        <button style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '7px', fontSize: '13px',
                            fontWeight: 600, cursor: 'pointer', border: 'none',
                            background: bgTertiary, color: textNormal,
                        }}>
                            <Icon d={Icons.generate} size={14} /> Generate Note
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: textMuted, fontSize: '14px' }}>
                        No subject folders found. Create a folder in your vault to get started.
                    </p>
                </div>
            )}
        </div>
    );

};

// ─── Page: Settings ───────────────────────────────────────────────────────────

const SettingsPage = () => {
    const [serverUrl, setServerUrl] = useState('http://localhost:8000');
    const [apiBase, setApiBase]     = useState('https://api.openai.com/v1');
    const [apiKey, setApiKey]       = useState('');
    const [subject, setSubject]     = useState('Calculus');
    const [status, setStatus]       = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

    const testConnection = () => {
        setStatus('testing');
        setTimeout(() => setStatus('ok'), 1500);
    };

    const statusPill = () => {
        if (status === 'ok')   return <span style={pill('#22c55e', 'rgba(34,197,94,0.15)')}>✓ Connected</span>;
        if (status === 'fail') return <span style={pill('#ef4444', 'rgba(239,68,68,0.15)')}>✗ Failed</span>;
        if (status === 'testing') return <span style={pill('#f97316', 'rgba(249,115,22,0.15)')}>● Testing…</span>;
        return null;
    };

    const field = (label: string, desc: string, value: string, onChange: (v: string) => void, type = 'text') => (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: textNormal, marginBottom: '4px' }}>{label}</label>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: textMuted }}>{desc}</p>
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px',
                    border: `1px solid ${border}`, background: bgTertiary,
                    color: textNormal, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                }}
            />
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: textNormal }}>⚙️ Settings</h2>
                <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '13px' }}>Configure your backend connection and LLM endpoints</p>
            </div>

            {/* Connection */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: textNormal }}>🔌 Backend Connection</h3>
                    {statusPill()}
                </div>
                {field('Python Backend Server URL', 'The local URL where your FastAPI server is running.', serverUrl, setServerUrl)}
                <button onClick={testConnection} disabled={status === 'testing'} style={btn(true)}>
                    {status === 'testing' ? 'Testing…' : 'Test Connection'}
                </button>
            </div>

            {/* LLM Config */}
            <div style={card}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: textNormal }}>🧠 LLM Configuration</h3>
                {field('API Endpoint (OpenAI Compatible)', 'For custom model pooling (AIClient2API, LiteLLM). Leave default for OpenAI.', apiBase, setApiBase)}
                {field('API Key', 'Sent securely via headers to your local Python backend — never stored in plain text.', apiKey, setApiKey, 'password')}
            </div>

            {/* Subject */}
            <div style={card}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: textNormal }}>📚 Active Subject</h3>
                {field('Active Subject Path', 'Path to the currently active subject folder inside your vault.', subject, setSubject)}
            </div>

            <button style={btn(true)}>Save Settings</button>
        </div>
    );
};

// ─── Navigation ───────────────────────────────────────────────────────────────

const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'home',     label: 'Home',       icon: Icons.home     },
    { id: 'generate', label: 'Generate',   icon: Icons.generate },
    { id: 'chat',     label: 'Chat',       icon: Icons.chat     },
    { id: 'skills',   label: 'Skills Lab', icon: Icons.skills   },
    { id: 'map',      label: 'Prog. Map',  icon: Icons.map      },
    { id: 'subjects', label: 'Subjects',   icon: Icons.subjects },
    { id: 'settings', label: 'Settings',   icon: Icons.settings },
];

// ─── Root App ─────────────────────────────────────────────────────────────────

export const App = ({ app }: { app: ObsidianApp }) => {
    const [page, setPage] = useState<Page>('home');

    const pageComponent: Record<Page, React.ReactNode> = {
        home:     <HomePage onNavigate={setPage} />,
        generate: <GeneratePage />,
        chat:     <ChatPage />,
        skills:   <SkillsPage />,
        map:      <MapPage />,
        subjects: <SubjectsPage />,
        settings: <SettingsPage />,
    };

    return (
        <ObsidianAppContext.Provider value={app}>
        <div style={{
            display: 'flex', height: '100%', background: bgPrimary,
            color: textNormal, fontFamily: 'var(--font-interface)', overflow: 'hidden',
        }}>
            {/* ── Left Nav ── */}
            <nav style={{
                width: '168px', flexShrink: 0, borderRight: `1px solid ${border}`,
                background: bgSecondary, display: 'flex', flexDirection: 'column',
                padding: '16px 10px', gap: '4px',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🧠</span>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: textNormal }}>Learning OS</span>
                </div>

                {/* Nav Items */}
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setPage(item.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        background: page === item.id ? accentColor : 'transparent',
                        color: page === item.id ? 'var(--text-on-accent)' : textMuted,
                        fontSize: '13px', fontWeight: page === item.id ? 600 : 400,
                        textAlign: 'left', width: '100%', transition: 'background 0.15s, color 0.15s',
                    }}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </button>
                ))}

                {/* Version */}
                <div style={{ marginTop: 'auto', padding: '8px', fontSize: '11px', color: textMuted }}>
                    v1.0.0 · Learning OS
                </div>
            </nav>

            {/* ── Main Content ── */}
            <main style={{
                flex: 1, overflowY: 'auto', padding: '28px 32px',
                display: 'flex', flexDirection: 'column',
            }}>
                {pageComponent[page]}
            </main>
        </div>
        </ObsidianAppContext.Provider>
    );
};
