import { useState, useEffect, useCallback } from 'react';
import { TFile, TFolder, TAbstractFile, Notice, normalizePath } from 'obsidian';
import { useObsidianApp } from './AppContext';
import { backendClient } from '../api/backendClient';

// ─── Shared style tokens (mirror App.tsx) ─────────────────────────────────────
const accentColor  = 'var(--interactive-accent)';
const bgPrimary    = 'var(--background-primary)';
const bgSecondary  = 'var(--background-secondary)';
const bgTertiary   = 'var(--background-secondary-alt)';
const border       = 'var(--background-modifier-border)';
const textNormal   = 'var(--text-normal)';
const textMuted    = 'var(--text-muted)';

const card: React.CSSProperties = {
    background: bgSecondary,
    border: `1px solid ${border}`,
    borderRadius: '10px',
    padding: '18px',
};

const btn = (primary = true): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '7px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', border: 'none',
    background: primary ? accentColor : bgTertiary,
    color: primary ? 'var(--text-on-accent)' : textNormal,
    transition: 'opacity 0.15s',
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaultFile { path: string; name: string; }
interface VaultFolder { path: string; name: string; files: VaultFile[]; }

const ARTIFACT_TYPES = [
    { id: 'study_note',   label: '📝 Study Note',        desc: 'Structured note with key concepts, examples, and diagrams.' },
    { id: 'flashcards',   label: '🃏 Flashcards',         desc: 'Anki-style Q&A cards from the selected material.' },
    { id: 'summary',      label: '📋 Summary',            desc: 'Concise TL;DR of the selected notes.' },
    { id: 'feynman',      label: '🔬 Feynman Sheet',      desc: 'Teach-it-back template with gap-detection prompts.' },
    { id: 'practice',     label: '✏️ Practice Problems',  desc: 'Worked examples and exercises with solutions.' },
];

const SKILLS = [
    { id: 'socratic',    label: 'Socratic Mode' },
    { id: 'metaphor',    label: 'Metaphor Engine' },
    { id: 'visual_bias', label: 'Visual Bias' },
    { id: 'spaced_rep',  label: 'Spaced Repetition' },
    { id: 'feynman',     label: 'Feynman Evaluator' },
];

// ─── GeneratePage ─────────────────────────────────────────────────────────────

export const GeneratePage = () => {
    const app = useObsidianApp();

    // Step state: 'select' → 'configure' → 'generating' → 'done'
    const [step, setStep]                   = useState<'select' | 'configure' | 'generating' | 'done'>('select');

    // Vault structure
    const [folders, setFolders]             = useState<VaultFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    // Configuration
    const [topic, setTopic]                 = useState('');
    const [artifactType, setArtifactType]   = useState('study_note');
    const [activeSkills, setActiveSkills]   = useState<Set<string>>(new Set(['socratic', 'metaphor']));
    const [outputPath, setOutputPath]       = useState('');

    // Output
    const [output, setOutput]               = useState('');
    const [error, setError]                 = useState('');
    const [copied, setCopied]               = useState(false);

    // ── Load vault folders on mount ──────────────────────────────────────────
    useEffect(() => {
        const vaultFolders: VaultFolder[] = [];
        const rootFiles: VaultFile[] = [];

        app.vault.getAllLoadedFiles().forEach((f: TAbstractFile) => {
            if (f instanceof TFolder && f.path !== '/') {
                const files = f.children
                    .filter((c): c is TFile => c instanceof TFile && c.extension === 'md')
                    .map(c => ({ path: c.path, name: c.name }));
                if (files.length > 0) vaultFolders.push({ path: f.path, name: f.name, files });
            } else if (f instanceof TFile && f.extension === 'md' && !f.path.includes('/')) {
                rootFiles.push({ path: f.path, name: f.name });
            }
        });

        // Add root-level notes as a virtual "/ (Root)" folder
        if (rootFiles.length > 0) {
            vaultFolders.unshift({ path: '/', name: '/ (Root)', files: rootFiles });
        }

        setFolders(vaultFolders);

        // Pre-select the first folder
        if (vaultFolders.length > 0 && !selectedFolder) {
            setSelectedFolder(vaultFolders[0].path);
        }
    }, [app]);

    // ── Derived: files in the selected folder ────────────────────────────────
    const currentFiles = folders.find(f => f.path === selectedFolder)?.files ?? [];

    // ── Toggle file selection ────────────────────────────────────────────────
    const toggleFile = (path: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const selectAllInFolder = () => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            currentFiles.forEach(f => next.add(f.path));
            return next;
        });
    };

    const clearSelection = () => setSelectedFiles(new Set());

    // ── Toggle skill ─────────────────────────────────────────────────────────
    const toggleSkill = (id: string) => {
        setActiveSkills(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Generate artifact ────────────────────────────────────────────────────
    const generate = useCallback(async () => {
        if (!topic.trim()) { setError('Please enter a topic.'); return; }
        if (selectedFiles.size === 0) { setError('Please select at least one note.'); return; }

        setStep('generating');
        setError('');

        try {
            // Read note contents from vault
            const notes = await Promise.all(
                Array.from(selectedFiles).map(async (path) => {
                    const file = app.vault.getAbstractFileByPath(path);
                    const content = file instanceof TFile
                        ? await app.vault.read(file)
                        : '';
                    return { path, content };
                })
            );

            const result = await backendClient.generateArtifact({
                topic: topic.trim(),
                notes,
                activeSkills: Array.from(activeSkills),
                artifactType,
            });

            setOutput(result.content);

            // Auto-suggest output path
            const safeName = (result.title || topic.trim())
                .replace(/[\\/:*?"<>|]/g, '-')
                .substring(0, 60);
            const folder = selectedFolder !== '/' ? selectedFolder + '/' : '';
            setOutputPath(`${folder}${safeName}.md`);

            setStep('done');
        } catch (err: any) {
            setError(
                err?.message?.includes('fetch') || err?.status === 0
                    ? '⚠️ Cannot reach backend. Start the Python server: cd learning-os-backend && python main.py'
                    : `Error: ${err?.message ?? String(err)}`
            );
            setStep('configure');
        }
    }, [app, topic, selectedFiles, activeSkills, artifactType, selectedFolder]);

    // ── Save artifact to vault ────────────────────────────────────────────────
    const saveToVault = async () => {
        if (!output || !outputPath) return;
        try {
            const path = normalizePath(outputPath);
            const existing = app.vault.getAbstractFileByPath(path);
            if (existing instanceof TFile) {
                await app.vault.modify(existing, output);
            } else {
                await app.vault.create(path, output);
            }
            new Notice(`✅ Saved: ${path}`);
            // Open the file in a new tab
            const file = app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                app.workspace.getLeaf('tab').openFile(file);
            }
        } catch (err: any) {
            new Notice(`❌ Save failed: ${err.message}`);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>

            {/* Header */}
            <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: textNormal }}>⚡ Artifact Creator</h2>
                <p style={{ margin: '4px 0 0', color: textMuted, fontSize: '13px' }}>
                    Select notes from your vault, configure generation settings, and produce a learning artifact.
                </p>
            </div>

            {/* Progress Steps */}
            <div style={{ display: 'flex', gap: '0', alignItems: 'center' }}>
                {(['select', 'configure', 'done'] as const).map((s, i) => {
                    const labels = ['1. Select Notes', '2. Configure', '3. Output'];
                    const active = step === s || (step === 'generating' && s === 'configure');
                    const done = (step === 'configure' && i === 0) || (step === 'generating' && i < 2) || (step === 'done' && i < 2);
                    return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                background: active ? accentColor : done ? 'rgba(34,197,94,0.15)' : bgTertiary,
                                color: active ? 'var(--text-on-accent)' : done ? '#22c55e' : textMuted,
                                cursor: done ? 'pointer' : 'default',
                                whiteSpace: 'nowrap',
                            }}
                                onClick={() => {
                                    if (s === 'select') setStep('select');
                                    if (s === 'configure' && (step === 'done')) setStep('configure');
                                }}
                            >
                                {done && '✓ '}{labels[i]}
                            </div>
                            {i < 2 && <div style={{ width: '24px', height: '1px', background: border }} />}
                        </div>
                    );
                })}
            </div>

            {/* ── Step 1: Select Notes ── */}
            {step === 'select' && (
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '14px' }}>
                    {/* Folder list */}
                    <div style={{ ...card, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            📁 Folders
                        </div>
                        {folders.length === 0 && (
                            <div style={{ fontSize: '12px', color: textMuted, padding: '8px' }}>No markdown folders found.</div>
                        )}
                        {folders.map(folder => (
                            <button key={folder.path} onClick={() => setSelectedFolder(folder.path)} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '7px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                background: selectedFolder === folder.path ? accentColor : 'transparent',
                                color: selectedFolder === folder.path ? 'var(--text-on-accent)' : textNormal,
                                fontSize: '13px',
                            }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {folder.name}
                                </span>
                                <span style={{ fontSize: '11px', opacity: 0.7, flexShrink: 0, marginLeft: '6px' }}>
                                    {folder.files.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* File list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '13px', color: textMuted }}>
                                {selectedFiles.size} note{selectedFiles.size !== 1 ? 's' : ''} selected
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={selectAllInFolder} style={{ ...btn(false), padding: '4px 10px', fontSize: '12px' }}>
                                    Select all
                                </button>
                                <button onClick={clearSelection} style={{ ...btn(false), padding: '4px 10px', fontSize: '12px' }}>
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div style={{ ...card, padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '340px', overflowY: 'auto' }}>
                            {currentFiles.length === 0 && (
                                <div style={{ padding: '16px', color: textMuted, fontSize: '13px', textAlign: 'center' }}>
                                    No markdown files in this folder.
                                </div>
                            )}
                            {currentFiles.map(file => {
                                const isSelected = selectedFiles.has(file.path);
                                return (
                                    <button key={file.path} onClick={() => toggleFile(file.path)} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                        background: isSelected ? 'rgba(124,106,247,0.12)' : 'transparent',
                                        width: '100%',
                                    }}>
                                        <div style={{
                                            width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                                            border: `2px solid ${isSelected ? accentColor : border}`,
                                            background: isSelected ? accentColor : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {isSelected && <span style={{ color: 'white', fontSize: '10px', lineHeight: 1 }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: '13px', color: textNormal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {file.name.replace(/\.md$/, '')}
                                        </span>
                                        <span style={{ fontSize: '11px', color: textMuted, marginLeft: 'auto', flexShrink: 0 }}>
                                            {file.path}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            disabled={selectedFiles.size === 0}
                            onClick={() => setStep('configure')}
                            style={{ ...btn(true), alignSelf: 'flex-end', opacity: selectedFiles.size === 0 ? 0.4 : 1 }}>
                            Continue with {selectedFiles.size} note{selectedFiles.size !== 1 ? 's' : ''} →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 2: Configure ── */}
            {(step === 'configure' || step === 'generating') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Selected notes summary */}
                    <div style={{ ...card, padding: '12px 16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Selected Notes ({selectedFiles.size})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Array.from(selectedFiles).map(path => (
                                <div key={path} style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '3px 10px 3px 8px', borderRadius: '20px',
                                    background: bgTertiary, border: `1px solid ${border}`, fontSize: '12px', color: textNormal,
                                }}>
                                    📄 {path.split('/').pop()?.replace(/\.md$/, '')}
                                    <button onClick={() => toggleFile(path)} style={{
                                        border: 'none', background: 'transparent', cursor: 'pointer',
                                        color: textMuted, padding: '0', fontSize: '13px', lineHeight: 1,
                                    }}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Topic */}
                    <div style={card}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: textNormal, marginBottom: '8px' }}>
                            Topic / Focus
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Derivatives, Integration by Parts, Chain Rule..."
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: `1px solid ${border}`, background: bgTertiary,
                                color: textNormal, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Artifact type */}
                    <div style={card}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: textNormal, marginBottom: '10px' }}>
                            Artifact Type
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {ARTIFACT_TYPES.map(t => (
                                <button key={t.id} onClick={() => setArtifactType(t.id)} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                    padding: '10px 14px', borderRadius: '8px', border: `2px solid ${artifactType === t.id ? accentColor : border}`,
                                    background: artifactType === t.id ? 'rgba(124,106,247,0.08)' : bgTertiary,
                                    cursor: 'pointer', textAlign: 'left',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: textNormal }}>{t.label}</div>
                                        <div style={{ fontSize: '12px', color: textMuted, marginTop: '2px' }}>{t.desc}</div>
                                    </div>
                                    {artifactType === t.id && <span style={{ color: accentColor, fontSize: '14px' }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Skills */}
                    <div style={card}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: textNormal, marginBottom: '10px' }}>
                            Active Skills
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {SKILLS.map(s => {
                                const on = activeSkills.has(s.id);
                                return (
                                    <button key={s.id} onClick={() => toggleSkill(s.id)} style={{
                                        padding: '5px 12px', borderRadius: '20px', border: `2px solid ${on ? accentColor : border}`,
                                        background: on ? 'rgba(124,106,247,0.12)' : 'transparent',
                                        color: on ? accentColor : textMuted,
                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    }}>
                                        {on ? '✓ ' : ''}{s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ ...card, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 16px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={() => setStep('select')} style={{ ...btn(false) }}>
                            ← Back
                        </button>
                        <button
                            onClick={generate}
                            disabled={step === 'generating'}
                            style={{ ...btn(true), opacity: step === 'generating' ? 0.6 : 1 }}>
                            {step === 'generating' ? '⏳ Generating…' : '⚡ Generate Artifact'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 3: Output ── */}
            {step === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setStep('configure')} style={{ ...btn(false) }}>← Edit</button>
                        <button onClick={copyToClipboard} style={{ ...btn(false) }}>
                            {copied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                        <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                value={outputPath}
                                onChange={e => setOutputPath(e.target.value)}
                                placeholder="Output path in vault (e.g. Calculus/Derivatives.md)"
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: '7px',
                                    border: `1px solid ${border}`, background: bgTertiary,
                                    color: textNormal, fontSize: '12px', outline: 'none',
                                }}
                            />
                            <button onClick={saveToVault} style={btn(true)}>
                                💾 Save to Vault
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
                        <div style={{
                            padding: '10px 16px', borderBottom: `1px solid ${border}`,
                            fontSize: '12px', fontWeight: 600, color: textMuted,
                            display: 'flex', justifyContent: 'space-between'
                        }}>
                            <span>Generated Output</span>
                            <span>{output.split('\n').length} lines · {output.length} chars</span>
                        </div>
                        <pre style={{
                            margin: 0, padding: '16px 20px',
                            fontSize: '13px', lineHeight: '1.7', color: textNormal,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            maxHeight: '480px', overflowY: 'auto',
                            background: bgPrimary,
                            fontFamily: 'var(--font-monospace)',
                        }}>
                            {output}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
