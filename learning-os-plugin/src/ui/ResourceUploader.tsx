import { useRef, useState } from 'react';
import { TFile, TFolder, normalizePath } from 'obsidian';
import { useObsidianApp } from './AppContext';
import { backendClient } from '../api/backendClient';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ACCEPTED_MIME_TYPES: Record<string, string> = {
    'pdf':  'application/pdf',
    'png':  'image/png',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif':  'image/gif',
    'txt':  'text/plain',
    'md':   'text/markdown',
};

const ACCEPTED_EXTENSIONS = Object.keys(ACCEPTED_MIME_TYPES)
    .map(ext => `.${ext}`)
    .join(',');

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'reading' | 'uploading' | 'ingesting' | 'done' | 'error';

export interface ResourceUploaderProps {
    /** Human-readable subject name, e.g. "Calculus" */
    subjectName: string;
    /** Vault-relative path to the subject folder, e.g. "Calculus" */
    subjectPath: string;
    /** Called after successful ingest so the parent can refresh its resource list */
    onIngested: (fileName: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert an ArrayBuffer to a base64 string (browser-safe, no Node.js Buffer) */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Derive MIME type from file extension, falling back to 'application/octet-stream' */
function getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return ACCEPTED_MIME_TYPES[ext] ?? 'application/octet-stream';
}

/** Ensure the resources subfolder exists in the vault, creating it if necessary */
async function ensureResourcesFolder(
    app: ReturnType<typeof useObsidianApp>,
    subjectPath: string
): Promise<string> {
    const resourcesPath = normalizePath(`${subjectPath}/resources`);
    const existing = app.vault.getAbstractFileByPath(resourcesPath);
    if (!existing) {
        await app.vault.createFolder(resourcesPath);
    }
    return resourcesPath;
}

/** Append a string to an existing vault file, or create the file if it doesn't exist */
async function appendOrCreateVaultFile(
    app: ReturnType<typeof useObsidianApp>,
    filePath: string,
    content: string,
    header?: string
): Promise<void> {
    const existing = app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
        const current = await app.vault.read(existing);
        await app.vault.modify(existing, current + content);
    } else {
        await app.vault.create(filePath, (header ?? '') + content);
    }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const accentColor  = 'var(--interactive-accent)';
const bgSecondary  = 'var(--background-secondary)';
const bgTertiary   = 'var(--background-secondary-alt)';
const border       = 'var(--background-modifier-border)';
const textNormal   = 'var(--text-normal)';
const textMuted    = 'var(--text-muted)';
const textOnAccent = 'var(--text-on-accent)';

const statusColors: Record<UploadStatus, string> = {
    idle:      textMuted,
    reading:   '#60a5fa',
    uploading: '#60a5fa',
    ingesting: '#a78bfa',
    done:      '#22c55e',
    error:     '#ef4444',
};

const statusLabels: Record<UploadStatus, string> = {
    idle:      '',
    reading:   'Reading file…',
    uploading: 'Saving to vault…',
    ingesting: 'Analyzing with AI…',
    done:      'Resource added!',
    error:     '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const ResourceUploader = ({ subjectName, subjectPath, onIngested }: ResourceUploaderProps) => {
    const app = useObsidianApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus]   = useState<UploadStatus>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isWorking = status === 'reading' || status === 'uploading' || status === 'ingesting';

    const handleButtonClick = () => {
        if (isWorking) return;
        setStatus('idle');
        setErrorMsg(null);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!fileInputRef.current) return;
        // Reset input so the same file can be re-uploaded after an error
        fileInputRef.current.value = '';

        if (!file) return;

        // ── Client-side validation ────────────────────────────────────────────
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setErrorMsg(`File is too large (max 20 MB). This file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
            setStatus('error');
            return;
        }

        const mimeType = getMimeType(file.name);
        if (mimeType === 'application/octet-stream') {
            setErrorMsg(`Unsupported file type. Accepted: PDF, PNG, JPG, WEBP, GIF, TXT, MD.`);
            setStatus('error');
            return;
        }

        try {
            // ── Step 1: Read file bytes ───────────────────────────────────────
            setStatus('reading');
            const arrayBuffer = await file.arrayBuffer();
            const contentBase64 = arrayBufferToBase64(arrayBuffer);

            // ── Step 2: Save file to vault ────────────────────────────────────
            setStatus('uploading');
            const resourcesFolder = await ensureResourcesFolder(app, subjectPath);
            const vaultFilePath = normalizePath(`${resourcesFolder}/${file.name}`);

            // Write binary files as binary, text files as UTF-8
            const isText = mimeType.startsWith('text/');
            if (isText) {
                const textContent = new TextDecoder('utf-8').decode(arrayBuffer);
                const existingFile = app.vault.getAbstractFileByPath(vaultFilePath);
                if (existingFile instanceof TFile) {
                    await app.vault.modify(existingFile, textContent);
                } else {
                    await app.vault.create(vaultFilePath, textContent);
                }
            } else {
                const existingFile = app.vault.getAbstractFileByPath(vaultFilePath);
                if (existingFile instanceof TFile) {
                    await app.vault.modifyBinary(existingFile, arrayBuffer);
                } else {
                    await app.vault.createBinary(vaultFilePath, arrayBuffer);
                }
            }

            // ── Step 3: Call the ingest API ───────────────────────────────────
            setStatus('ingesting');
            const result = await backendClient.ingestResource({
                subjectName,
                fileName:      file.name,
                mimeType,
                contentBase64,
            });

            // ── Step 4: Write the index entry to _resource-index.md ──────────
            const indexPath = normalizePath(`${subjectPath}/_resource-index.md`);
            const indexHeader = (
                `# Resource Index — ${subjectName}\n` +
                `_Auto-generated. Do not edit manually._\n\n` +
                `---\n`
            );
            await appendOrCreateVaultFile(app, indexPath, result.index_entry, indexHeader);

            // ── Done ──────────────────────────────────────────────────────────
            setStatus('done');
            onIngested(file.name);

            // Reset to idle after 3 s so the button is ready again
            setTimeout(() => setStatus('idle'), 3000);

        } catch (err: any) {
            const msg = err?.message ?? String(err);
            setErrorMsg(msg);
            setStatus('error');
            console.error('LearningOS ResourceUploader error:', err);
        }
    };

    return (
        <div>
            {/* Hidden native file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Upload button */}
            <button
                onClick={handleButtonClick}
                disabled={isWorking}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isWorking ? 'not-allowed' : 'pointer',
                    border: 'none',
                    background: isWorking ? bgTertiary : accentColor,
                    color: isWorking ? textMuted : textOnAccent,
                    opacity: isWorking ? 0.7 : 1,
                    transition: 'opacity 0.15s, background 0.15s',
                }}
            >
                {/* Spinner or upload icon */}
                {isWorking ? (
                    <span style={{
                        display: 'inline-block',
                        width: '14px', height: '14px',
                        border: `2px solid ${textMuted}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                    }} />
                ) : (
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2.5}
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
                    </svg>
                )}
                {status === 'done' ? '✓ Added!' : 'Add Resource'}
            </button>

            {/* Status / error message */}
            {(status !== 'idle' && status !== 'done') && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: statusColors[status],
                    lineHeight: 1.5,
                }}>
                    {status === 'error'
                        ? `⚠ ${errorMsg}`
                        : `⏳ ${statusLabels[status]}`}
                </div>
            )}

            {/* Keyframes for spinner (injected once via a <style> tag) */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};
