import { router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

interface ActionableTask {
    title: string;
    sub_tasks: string[];
    category?: string;
    priority?: string;
}

interface Message {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    time: string;
    source?: 'gemini' | 'built_in' | 'security_guardrail';
    actionableTask?: ActionableTask | null;
    taskCreated?: boolean;
}

interface AiAssistantDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIdx) {
            parts.push(text.substring(lastIdx, match.index));
        }

        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
            parts.push(
                <strong key={`b-${key++}`} className="font-bold text-text-primary">
                    {token.slice(2, -2)}
                </strong>
            );
        } else if (token.startsWith('*') && token.endsWith('*')) {
            parts.push(
                <em key={`i-${key++}`} className="italic text-text-secondary">
                    {token.slice(1, -1)}
                </em>
            );
        } else if (token.startsWith('`') && token.endsWith('`')) {
            parts.push(
                <code
                    key={`c-${key++}`}
                    className="px-1 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-[11px]"
                >
                    {token.slice(1, -1)}
                </code>
            );
        }
        lastIdx = pattern.lastIndex;
    }

    if (lastIdx < text.length) {
        parts.push(text.substring(lastIdx));
    }

    return parts.length > 0 ? parts : [text];
}

function FormattedContent({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
    if (!text && isStreaming) {
        return <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse align-middle" />;
    }
    if (!text) return null;

    const lines = text.split('\n');

    return (
        <div className="space-y-1 text-sm leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                const isLastLine = idx === lines.length - 1;

                if (!trimmed) {
                    return <div key={idx} className="h-1.5" />;
                }

                if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
                    const headerText = trimmed.replace(/^#{2,3}\s+/, '');
                    return (
                        <div key={idx} className="font-bold text-body-md text-text-primary mt-2 mb-1">
                            {renderInlineFormatting(headerText)}
                            {isLastLine && isStreaming && (
                                <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
                            )}
                        </div>
                    );
                }

                if (/^[-*]\s+/.test(trimmed)) {
                    const bulletText = trimmed.replace(/^[-*]\s+/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1">
                            <span className="text-primary font-bold leading-5">•</span>
                            <span className="flex-1">
                                {renderInlineFormatting(bulletText)}
                                {isLastLine && isStreaming && (
                                    <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
                                )}
                            </span>
                        </div>
                    );
                }

                const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
                if (numMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1">
                            <span className="text-primary font-bold text-xs leading-5">{numMatch[1]}.</span>
                            <span className="flex-1">
                                {renderInlineFormatting(numMatch[2])}
                                {isLastLine && isStreaming && (
                                    <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
                                )}
                            </span>
                        </div>
                    );
                }

                return (
                    <p key={idx} className="my-0.5">
                        {renderInlineFormatting(line)}
                        {isLastLine && isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
                        )}
                    </p>
                );
            })}
        </div>
    );
}

export default function AiAssistantDrawer({ isOpen, onClose, userName = 'User' }: AiAssistantDrawerProps) {
    const [activeTab, setActiveTab] = useState<'assistant' | 'help'>('assistant');
    const [inputPrompt, setInputPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
    const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<{ is_configured: boolean; provider: string; model: string } | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init-1',
            sender: 'assistant',
            text: `Hello ${userName}! 👋 I am **Kora**, your personal productivity assistant.\n\nI can help you prioritize your day, break down complex goals into actionable checklists, summarize your performance, or answer questions about Taskora features.`,
            time: 'Just now',
            source: 'built_in',
        },
    ]);

    // Fetch AI Status
    useEffect(() => {
        if (isOpen && !aiStatus) {
            fetch('/ai/status', {
                headers: {
                    Accept: 'application/json',
                },
            })
                .then((res) => res.json())
                .then((data) => setAiStatus(data))
                .catch(() => {});
        }
    }, [isOpen, aiStatus]);

    // Scroll chat to bottom on new message or live stream chunk
    useEffect(() => {
        if (isOpen && activeTab === 'assistant') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, activeTab, isStreaming]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && activeTab === 'assistant') {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, activeTab]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const getCsrfToken = (): string => {
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        return meta ? meta.content : '';
    };

    const handleSendMessage = async (textToSend?: string, actionType?: string) => {
        const messageText = (textToSend || inputPrompt).trim();
        if (!messageText || isLoading || isStreaming) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const aiMsgId = `ai-${Date.now()}`;
        const initialAssistantMsg: Message = {
            id: aiMsgId,
            sender: 'assistant',
            text: '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'built_in',
        };

        setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
        setInputPrompt('');
        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMsgId(aiMsgId);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const res = await fetch('/ai/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream, application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    message: messageText,
                    action: actionType || 'chat',
                }),
                signal: abortController.signal,
            });

            if (!res.ok || !res.body) {
                throw new Error('Streaming failed or endpoint unavailable');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let accumulatedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data:')) {
                        const jsonStr = trimmed.slice(5).trim();
                        if (!jsonStr) continue;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.token) {
                                accumulatedText += parsed.token;
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === aiMsgId ? { ...m, text: accumulatedText } : m
                                    )
                                );
                            }
                            if (parsed.done) {
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === aiMsgId
                                            ? {
                                                  ...m,
                                                  text: parsed.reply || accumulatedText,
                                                  source: parsed.source,
                                                  actionableTask: parsed.actionable_task,
                                              }
                                            : m
                                    )
                                );
                            }
                        } catch {
                            // Partial chunk; keep buffer
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                // User clicked "Stop" - keep streamed response intact
            } else {
                // Graceful fallback to standard JSON endpoint
                try {
                    const fallbackRes = await fetch('/ai/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-CSRF-TOKEN': getCsrfToken(),
                        },
                        body: JSON.stringify({
                            message: messageText,
                            action: actionType || 'chat',
                        }),
                    });
                    const fallbackData = await fallbackRes.json();
                    if (fallbackData.success) {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === aiMsgId
                                    ? {
                                          ...m,
                                          text: fallbackData.reply,
                                          source: fallbackData.source,
                                          actionableTask: fallbackData.actionable_task,
                                      }
                                    : m
                            )
                        );
                    }
                } catch {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === aiMsgId
                                ? {
                                      ...m,
                                      text: 'Unable to connect to the assistant service right now. Please check your network connection.',
                                  }
                                : m
                        )
                    );
                }
            }
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            setStreamingMsgId(null);
            abortControllerRef.current = null;
        }
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
            setIsStreaming(false);
            setStreamingMsgId(null);
        }
    };

    const handleCreateTaskFromAi = async (messageId: string, taskData: ActionableTask) => {
        setCreatingTaskId(messageId);
        try {
            const res = await fetch('/ai/quick-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    title: taskData.title,
                    category: taskData.category || 'General',
                    priority: taskData.priority || 'medium',
                    sub_tasks: taskData.sub_tasks,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === messageId ? { ...m, taskCreated: true } : m))
                );
                // Refresh Inertia in background so new task appears across the application
                router.reload();
            } else {
                alert('Could not create task: ' + (data.message || 'Unknown error'));
            }
        } catch {
            alert('Failed to connect to server to create task.');
        } finally {
            setCreatingTaskId(null);
        }
    };

    const handleClearChat = () => {
        if (isStreaming) {
            handleStopGeneration();
        }
        setMessages([
            {
                id: `reset-${Date.now()}`,
                sender: 'assistant',
                text: 'Chat history cleared. How can I assist your productivity today?',
                time: 'Just now',
                source: 'built_in',
            },
        ]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Dark Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <aside
                aria-label="Kora AI Assistant and Support Drawer"
                className="relative z-10 w-full max-w-lg bg-surface-card border-l border-border-subtle shadow-2xl flex flex-col h-full animate-slideInRight overflow-hidden"
            >
                {/* Drawer Top Header */}
                <div className="px-6 py-4 border-b border-border-subtle bg-surface-card flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-body-lg font-bold text-text-primary tracking-tight">
                                    Kora
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                                    AI Assistant
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-caption font-caption text-text-muted">
                                <span>{aiStatus?.provider || 'Productivity Assistant'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleClearChat}
                            title="Reset Chat"
                            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-canvas rounded-lg transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-canvas rounded-lg transition-colors cursor-pointer"
                            aria-label="Close Support Drawer"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-2 bg-surface-container-low/40 border-b border-border-subtle flex gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('assistant')}
                        className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'assistant'
                                ? 'border-primary text-primary font-bold'
                                : 'border-transparent text-text-muted hover:text-text-primary'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                        Ask Kora
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('help')}
                        className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'help'
                                ? 'border-primary text-primary font-bold'
                                : 'border-transparent text-text-muted hover:text-text-primary'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">help</span>
                        Help & System Guide
                    </button>
                </div>

                {/* Tab 1: AI Assistant View */}
                {activeTab === 'assistant' && (
                    <div className="flex-1 flex flex-col min-h-0 bg-bg-canvas">
                        {/* Quick Prompts Bar */}
                        <div className="p-3 bg-surface-card border-b border-border-subtle overflow-x-auto scrollbar-none flex gap-2 shrink-0">
                            <button
                                type="button"
                                disabled={isLoading || isStreaming}
                                onClick={() => handleSendMessage('What should I prioritize today?', 'prioritize')}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-bg-canvas hover:bg-primary-container hover:text-on-primary border border-border-subtle text-text-secondary whitespace-nowrap transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[14px]">flag</span>
                                Prioritize My Day
                            </button>
                            <button
                                type="button"
                                disabled={isLoading || isStreaming}
                                onClick={() => handleSendMessage('Break down my new project goal into a 5-step checklist', 'breakdown')}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-bg-canvas hover:bg-primary-container hover:text-on-primary border border-border-subtle text-text-secondary whitespace-nowrap transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[14px]">checklist</span>
                                Break Down Goal
                            </button>
                            <button
                                type="button"
                                disabled={isLoading || isStreaming}
                                onClick={() => handleSendMessage('Summarize my weekly performance and task completion', 'weekly_summary')}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-bg-canvas hover:bg-primary-container hover:text-on-primary border border-border-subtle text-text-secondary whitespace-nowrap transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[14px]">monitoring</span>
                                Weekly Summary
                            </button>
                        </div>

                        {/* Chat Messages Stream */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex flex-col ${
                                        m.sender === 'user' ? 'items-end' : 'items-start'
                                    }`}
                                >
                                    <div
                                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                            m.sender === 'user'
                                                ? 'bg-primary-container text-on-primary rounded-br-xs shadow-xs'
                                                : m.source === 'security_guardrail'
                                                ? 'bg-amber-50/80 text-text-primary border border-amber-200 rounded-bl-xs shadow-2xs'
                                                : 'bg-surface-card text-text-primary border border-border-subtle rounded-bl-xs shadow-2xs'
                                        }`}
                                    >
                                        {/* Message Text with Real-Time Typing Cursor */}
                                        <div className="font-sans">
                                            <FormattedContent
                                                text={m.text}
                                                isStreaming={isStreaming && streamingMsgId === m.id}
                                            />
                                        </div>

                                        {/* Actionable Task Card */}
                                        {m.actionableTask && (
                                            <div className="mt-3 p-3 bg-bg-canvas border border-border-subtle rounded-xl space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-text-primary flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[16px] text-primary">
                                                            check_box
                                                        </span>
                                                        {m.actionableTask.title}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                                                        {m.actionableTask.category || 'Projects'}
                                                    </span>
                                                </div>

                                                <ul className="space-y-1 text-text-secondary pl-1">
                                                    {m.actionableTask.sub_tasks.map((step, idx) => (
                                                        <li key={idx} className="flex items-start gap-1.5">
                                                            <span className="text-primary font-bold">
                                                                {idx + 1}.
                                                            </span>
                                                            <span>{step}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                <div className="pt-2 border-t border-border-subtle flex justify-end">
                                                    {m.taskCreated ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold py-1 px-2 rounded bg-emerald-50 text-[11px]">
                                                            <span className="material-symbols-outlined text-[14px]">
                                                                check_circle
                                                            </span>
                                                            Added to Tasks!
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={creatingTaskId === m.id}
                                                            onClick={() =>
                                                                handleCreateTaskFromAi(m.id, m.actionableTask!)
                                                            }
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                                        >
                                                            {creatingTaskId === m.id ? (
                                                                <>
                                                                    <span className="animate-spin text-xs">
                                                                        ⏳
                                                                    </span>
                                                                    Creating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="material-symbols-outlined text-[14px]">
                                                                        add
                                                                    </span>
                                                                    Add to My Tasks
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                                                m.sender === 'user' ? 'text-white/80 justify-end' : 'text-text-muted'
                                            }`}
                                        >
                                            <span>{m.time}</span>
                                            {m.source === 'gemini' && (
                                                <span className="text-[9px] bg-primary/15 text-primary px-1 rounded">
                                                    Gemini Live
                                                </span>
                                            )}
                                            {m.source === 'security_guardrail' && (
                                                <span className="text-[9px] bg-amber-200/60 text-amber-900 font-semibold px-1 rounded flex items-center gap-0.5">
                                                    Notice
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Thinking state before first stream chunk arrives */}
                            {isLoading && isStreaming && messages.find((m) => m.id === streamingMsgId)?.text === '' && (
                                <div className="flex items-start gap-2">
                                    <div className="bg-surface-card border border-border-subtle rounded-2xl px-4 py-3 text-xs text-text-muted flex items-center gap-2 shadow-2xs">
                                        <span className="animate-spin text-primary">⏳</span>
                                        <span>Kora is thinking...</span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Box */}
                        <div className="p-3 bg-surface-card border-t border-border-subtle shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex gap-2"
                            >
                                <textarea
                                    ref={inputRef}
                                    rows={2}
                                    value={inputPrompt}
                                    onChange={(e) => setInputPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ask for advice, decompose a goal, or seek task guidance..."
                                    className="flex-1 text-xs text-text-primary bg-bg-canvas border border-border-subtle rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none leading-relaxed"
                                />

                                {isStreaming ? (
                                    <button
                                        type="button"
                                        onClick={handleStopGeneration}
                                        className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                        title="Stop response"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                                        <span className="hidden sm:inline">Stop</span>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!inputPrompt.trim() || isLoading}
                                        className="px-4 bg-primary-container hover:bg-accent-hover text-on-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-xs flex items-center justify-center transition-all cursor-pointer shadow-xs"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                    </button>
                                )}
                            </form>
                            <div className="mt-2 text-[10px] text-text-muted flex items-center justify-between px-1">
                                <span>Tip: Shift+Enter for new line</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Help & System Guide View */}
                {activeTab === 'help' && (
                    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-bg-canvas text-text-primary text-sm">
                        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-2xs space-y-2">
                            <h4 className="font-bold text-body-md text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">
                                    checklist
                                </span>
                                Sub-Task Checklists
                            </h4>
                            <p className="text-text-muted text-xs leading-relaxed">
                                Break large deliverables into smaller actionable steps. In your task list, click
                                the <strong>Steps</strong> button on any row or open the <strong>Edit Modal</strong>{' '}
                                to add checklist steps with instant completion checkboxes and progress pills.
                            </p>
                        </div>

                        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-2xs space-y-2">
                            <h4 className="font-bold text-body-md text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">
                                    attach_file
                                </span>
                                File Attachments (10MB Limit)
                            </h4>
                            <p className="text-text-muted text-xs leading-relaxed">
                                Upload reference documents, PDFs, design files, or spreadsheets directly to tasks.
                                Files are stored securely on the local server disk with streamed download links and
                                automatic cascade cleanup when tasks are deleted.
                            </p>
                        </div>

                        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-2xs space-y-2">
                            <h4 className="font-bold text-body-md text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">
                                    notifications_active
                                </span>
                                Due Date Badges & Reminders
                            </h4>
                            <p className="text-text-muted text-xs leading-relaxed">
                                Task deadlines are tracked against the system clock:
                            </p>
                            <ul className="text-xs space-y-1.5 text-text-secondary pl-2">
                                <li className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                        Overdue
                                    </span>
                                    <span>Tasks past their deadline requiring immediate resolution.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                        Due Today
                                    </span>
                                    <span>Items scheduled for today to keep daily focus sharp.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-2xs space-y-2">
                            <h4 className="font-bold text-body-md text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">
                                    mail
                                </span>
                                Live Mail Transport (Phase 7)
                            </h4>
                            <p className="text-text-muted text-xs leading-relaxed">
                                Password resets and verification notifications can be dispatched directly to your inbox
                                via SMTP or Resend API. In local development, emails are safely logged to{' '}
                                <code className="px-1 py-0.5 bg-surface-container-highest rounded text-[11px]">
                                    storage/logs/laravel.log
                                </code>
                                .
                            </p>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
