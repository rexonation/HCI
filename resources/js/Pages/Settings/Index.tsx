import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { previewChime } from '@/Utils/sound';

export default function SettingsIndex() {
    const [defaultPriority, setDefaultPriority] = useState<'low' | 'medium' | 'high'>(() => {
        try {
            return (localStorage.getItem('taskora_default_priority') as any) || 'medium';
        } catch {
            return 'medium';
        }
    });
    const [defaultCategory, setDefaultCategory] = useState(() => {
        try {
            return localStorage.getItem('taskora_default_category') || 'General';
        } catch {
            return 'General';
        }
    });
    const [weeklyGoal, setWeeklyGoal] = useState(() => {
        try {
            const stored = localStorage.getItem('taskora_weekly_goal');
            return stored ? parseInt(stored, 10) : 25;
        } catch {
            return 25;
        }
    });
    const [emailReminders, setEmailReminders] = useState(() => {
        try {
            return localStorage.getItem('taskora_email_reminders') !== 'false';
        } catch {
            return true;
        }
    });
    const [soundEffects, setSoundEffects] = useState(() => {
        try {
            return localStorage.getItem('taskora_sound_effects') === 'true';
        } catch {
            return false;
        }
    });
    const [savedMessage, setSavedMessage] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Save local preferences
        localStorage.setItem('taskora_default_priority', defaultPriority);
        localStorage.setItem('taskora_default_category', defaultCategory);
        localStorage.setItem('taskora_weekly_goal', weeklyGoal.toString());
        localStorage.setItem('taskora_email_reminders', emailReminders.toString());
        localStorage.setItem('taskora_sound_effects', soundEffects.toString());
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2">
                    <span className="text-body-md font-body-md text-text-muted">Taskora</span>
                    <span className="text-caption font-caption text-text-muted">/</span>
                    <span className="text-label-md font-label-md font-semibold text-text-primary">Settings</span>
                </div>
            }
        >
            <Head title="Settings — Taskora" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight font-bold">Preferences & Settings</h1>
                    <p className="text-body-md font-body-md text-text-muted mt-1">Configure your productivity workflows and defaults.</p>
                </div>
                {savedMessage && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-badge-completed-bg text-badge-completed-text border border-badge-completed-text/20 rounded-full text-label-sm font-semibold transition-all">
                        <span className="material-symbols-outlined text-base fill-1">check_circle</span>
                        Preferences saved!
                    </div>
                )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Task Defaults Card */}
                <div className="bg-surface-card border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle bg-surface-container-low/50">
                        <div className="p-2 rounded-lg bg-surface-card border border-border-subtle text-primary">
                            <span className="material-symbols-outlined text-xl">tune</span>
                        </div>
                        <div>
                            <h2 className="text-title-sm font-title-sm text-text-primary font-bold">Task Creation Defaults</h2>
                            <p className="text-caption font-caption text-text-muted">Set automatic defaults when adding new tasks quickly.</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                                    Default Priority Level
                                </label>
                                <select
                                    value={defaultPriority}
                                    onChange={(e) => setDefaultPriority(e.target.value as any)}
                                    className="w-full h-11 px-3.5 bg-bg-canvas border border-border-subtle rounded-lg text-body-md text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                                    Default Category Tag
                                </label>
                                <input
                                    type="text"
                                    value={defaultCategory}
                                    onChange={(e) => setDefaultCategory(e.target.value)}
                                    className="w-full h-11 px-3.5 bg-bg-canvas border border-border-subtle rounded-lg text-body-md text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    placeholder="e.g. Work, Study, General"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-label-sm font-label-sm font-semibold text-text-primary mb-1.5">
                                Weekly Target Goal (Tasks / Week)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={weeklyGoal}
                                onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 25)}
                                className="w-full md:w-64 h-11 px-3.5 bg-bg-canvas border border-border-subtle rounded-lg text-body-md text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-caption text-text-muted mt-1">This drives your Weekly Focus sprint bar on the Dashboard.</p>
                        </div>
                    </div>
                </div>

                {/* Notifications & Audio Card */}
                <div className="bg-surface-card border border-border-subtle rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle bg-surface-container-low/50">
                        <div className="p-2 rounded-lg bg-surface-card border border-border-subtle text-primary">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                        </div>
                        <div>
                            <h2 className="text-title-sm font-title-sm text-text-primary font-bold">Alerts & Behavior</h2>
                            <p className="text-caption font-caption text-text-muted">Manage reminders and interface feedback.</p>
                        </div>
                    </div>

                    <div className="p-6 divide-y divide-border-subtle">
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <span className="text-body-md font-semibold text-text-primary block">Daily Morning Digest</span>
                                <span className="text-caption text-text-muted">Receive a recap of upcoming tasks at 8:00 AM.</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={emailReminders}
                                onChange={(e) => {
                                    setEmailReminders(e.target.checked);
                                    localStorage.setItem('taskora_email_reminders', e.target.checked.toString());
                                }}
                                className="w-5 h-5 rounded border-border-hover text-primary focus:ring-primary cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-body-md font-semibold text-text-primary block">Task Completion Sound</span>
                                    <button
                                        type="button"
                                        onClick={() => previewChime()}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-accent-hover bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                                        title="Click to test chime"
                                    >
                                        <span className="material-symbols-outlined text-[13px]">volume_up</span>
                                        <span>Test Chime</span>
                                    </button>
                                </div>
                                <span className="text-caption text-text-muted">Play a pleasant chime when checking off a task.</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={soundEffects}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSoundEffects(checked);
                                    localStorage.setItem('taskora_sound_effects', checked.toString());
                                    if (checked) {
                                        previewChime();
                                    }
                                }}
                                className="w-5 h-5 rounded border-border-hover text-primary focus:ring-primary cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="h-11 px-6 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-md font-semibold transition-all duration-150 active:scale-[0.98] shadow-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">save</span>
                        <span>Save Preferences</span>
                    </button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
