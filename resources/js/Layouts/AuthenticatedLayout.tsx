import Modal from '@/Components/Modal';
import AiAssistantDrawer from '@/Components/AiAssistantDrawer';
import { Link, router, usePage } from '@inertiajs/react';
import React, { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';

export interface SystemNotification {
    id: string;
    type: 'urgent' | 'warning' | 'priority' | 'info' | 'success';
    title: string;
    message: string;
    time: string;
    icon: string;
    action_url: string;
}

export default function AuthenticatedLayout({
    header,
    children,
    onAddTaskClick,
    pendingTasksCount = 0,
}: PropsWithChildren<{
    header?: ReactNode;
    onAddTaskClick?: () => void;
    pendingTasksCount?: number;
}>) {
    const pageProps = usePage().props as any;
    const auth = pageProps?.auth;
    const user = auth?.user || { name: 'User', email: '' };
    const systemNotifications = (pageProps?.systemNotifications || []) as SystemNotification[];

    const [searchQuery, setSearchQuery] = useState('');

    // AI & Support Slide-over State (Phase 7)
    const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

    // Notification State
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const notificationDropdownRef = useRef<HTMLDivElement>(null);

    // Load persisted notification reads & dismissals
    useEffect(() => {
        try {
            const storedRead = JSON.parse(localStorage.getItem('taskora_read_notifications') || '[]');
            const storedDismissed = JSON.parse(localStorage.getItem('taskora_dismissed_notifications') || '[]');
            if (Array.isArray(storedRead)) setReadIds(storedRead);
            if (Array.isArray(storedDismissed)) setDismissedIds(storedDismissed);
        } catch {
            // Ignore parse errors
        }
    }, []);

    // Outside click & escape listener to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                notificationDropdownRef.current &&
                !notificationDropdownRef.current.contains(event.target as Node)
            ) {
                setIsNotificationOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsNotificationOpen(false);
            }
        };

        if (isNotificationOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isNotificationOpen]);

    const activeNotifications = systemNotifications.filter((n) => !dismissedIds.includes(n.id));
    const unreadCount = activeNotifications.filter((n) => !readIds.includes(n.id)).length;

    const handleMarkAllAsRead = () => {
        const allActiveIds = activeNotifications.map((n) => n.id);
        const updated = Array.from(new Set([...readIds, ...allActiveIds]));
        setReadIds(updated);
        localStorage.setItem('taskora_read_notifications', JSON.stringify(updated));
    };

    const handleNotificationClick = (notification: SystemNotification) => {
        if (!readIds.includes(notification.id)) {
            const updated = [...readIds, notification.id];
            setReadIds(updated);
            localStorage.setItem('taskora_read_notifications', JSON.stringify(updated));
        }
        setIsNotificationOpen(false);
        router.visit(notification.action_url);
    };

    const handleDismissNotification = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = [...dismissedIds, id];
        setDismissedIds(updated);
        localStorage.setItem('taskora_dismissed_notifications', JSON.stringify(updated));
    };

    // Global Task Creation Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalDescription, setModalDescription] = useState('');
    const [modalCategory, setModalCategory] = useState(() => {
        try {
            return localStorage.getItem('taskora_default_category') || 'General';
        } catch {
            return 'General';
        }
    });
    const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high'>(() => {
        try {
            return (localStorage.getItem('taskora_default_priority') as any) || 'medium';
        } catch {
            return 'medium';
        }
    });
    const [modalDueDate, setModalDueDate] = useState('');
    const [modalDueTime, setModalDueTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Productivity Features: Sub-tasks & Attachments in Create Modal
    const [modalSubTasks, setModalSubTasks] = useState<string[]>([]);
    const [modalSubTaskInput, setModalSubTaskInput] = useState('');
    const [modalAttachment, setModalAttachment] = useState<File | null>(null);
    const modalFileInputRef = useRef<HTMLInputElement | null>(null);

    // Listen for custom open event (e.g. from Dashboard or any page)
    useEffect(() => {
        const handleOpenEvent = () => setIsTaskModalOpen(true);
        window.addEventListener('taskora:open-task-modal', handleOpenEvent);
        return () => window.removeEventListener('taskora:open-task-modal', handleOpenEvent);
    }, []);

    const handleAddModalSubTask = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = modalSubTaskInput.trim();
        if (!text) return;
        setModalSubTasks((prev) => [...prev, text]);
        setModalSubTaskInput('');
    };

    const handleRemoveModalSubTask = (index: number) => {
        setModalSubTasks((prev) => prev.filter((_, i) => i !== index));
    };

    const handleModalFileSelected = (file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File exceeds the 10MB limit.');
            return;
        }
        setModalAttachment(file);
    };

    const handleRemoveModalFile = () => {
        setModalAttachment(null);
        if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    };

    const handleOpenTaskModal = () => {
        if (onAddTaskClick) {
            onAddTaskClick();
        } else {
            setIsTaskModalOpen(true);
        }
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalTitle.trim()) return;
        setIsSubmitting(true);

        let combinedDueAt: string | null = null;
        if (modalDueDate && modalDueTime) {
            combinedDueAt = `${modalDueDate} ${modalDueTime}:00`;
        } else if (modalDueDate) {
            combinedDueAt = `${modalDueDate} 23:59:00`;
        } else if (modalDueTime) {
            const today = new Date().toISOString().split('T')[0];
            combinedDueAt = `${today} ${modalDueTime}:00`;
        }

        router.post(
            route('tasks.store'),
            {
                title: modalTitle.trim(),
                description: modalDescription.trim() || null,
                category: modalCategory || 'General',
                priority: modalPriority,
                due_at: combinedDueAt,
                sub_tasks: modalSubTasks.length > 0 ? modalSubTasks : undefined,
                attachment: modalAttachment || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setModalTitle('');
                    setModalDescription('');
                    setModalCategory('General');
                    setModalDueDate('');
                    setModalDueTime('');
                    setModalPriority('medium');
                    setModalSubTasks([]);
                    setModalSubTaskInput('');
                    setModalAttachment(null);
                    if (modalFileInputRef.current) modalFileInputRef.current.value = '';
                    setIsTaskModalOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            }
        );
    };

    const handleGlobalSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.get(route('tasks.index'), { search: searchQuery.trim() });
        }
    };

    return (
        <div className="bg-bg-canvas text-text-primary antialiased flex min-h-screen font-body-md selection:bg-primary-fixed selection:text-primary">
            {/* Left Sidebar Navigation */}
            <aside
                aria-label="Sidebar Navigation"
                className="w-64 min-h-screen p-4 flex flex-col justify-between shrink-0 bg-surface-card border-r border-border-subtle select-none"
            >
                <div className="flex flex-col gap-6">
                    {/* Brand at top — Clicking logo directs back to home/dashboard */}
                    <Link
                        href={route('dashboard')}
                        className="flex items-center gap-3 px-2 pt-1 group focus:outline-none"
                    >
                        <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:bg-accent-hover transition-colors">
                            <span className="material-symbols-outlined text-[20px] fill-1">check_circle</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-headline-md font-headline-md font-bold text-text-primary tracking-tight leading-tight">
                                Taskora
                            </span>
                            <span className="text-caption font-caption text-text-muted">Task Management</span>
                        </div>
                    </Link>

                    {/* Primary '+ Add Task' button below brand */}
                    <button
                        type="button"
                        onClick={handleOpenTaskModal}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary-container hover:bg-accent-hover text-on-primary text-label-md font-label-md transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span>Add Task</span>
                    </button>

                    {/* Sidebar Nav Links */}
                    <nav aria-label="Main Navigation" className="flex flex-col gap-1.5">
                        {/* Dashboard */}
                        <Link
                            href={route('dashboard')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] ${
                                route().current('dashboard')
                                    ? 'bg-surface-container-low text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-canvas'
                            }`}
                        >
                            <span
                                className={`material-symbols-outlined text-[20px] ${
                                    route().current('dashboard') ? 'fill-1' : ''
                                }`}
                            >
                                dashboard
                            </span>
                            <span className="text-label-md font-label-md">Dashboard</span>
                        </Link>

                        {/* My Tasks */}
                        <Link
                            href={route('tasks.index')}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] ${
                                route().current('tasks.*')
                                    ? 'bg-surface-container-low text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-canvas'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={`material-symbols-outlined text-[20px] ${
                                        route().current('tasks.*') ? 'fill-1' : ''
                                    }`}
                                >
                                    check_circle
                                </span>
                                <span className="text-label-md font-label-md">My Tasks</span>
                            </div>
                            {pendingTasksCount > 0 && (
                                <span className="text-caption font-caption px-2 py-0.5 rounded-full bg-surface-container-highest text-text-muted font-bold">
                                    {pendingTasksCount}
                                </span>
                            )}
                        </Link>

                        {/* Settings */}
                        <Link
                            href={route('settings.index')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] ${
                                route().current('settings.index')
                                    ? 'bg-surface-container-low text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-canvas'
                            }`}
                        >
                            <span
                                className={`material-symbols-outlined text-[20px] ${
                                    route().current('settings.index') ? 'fill-1' : ''
                                }`}
                            >
                                settings
                            </span>
                            <span className="text-label-md font-label-md">Settings</span>
                        </Link>

                        {/* Profile */}
                        <Link
                            href={route('profile.edit')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] ${
                                route().current('profile.edit')
                                    ? 'bg-surface-container-low text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-bg-canvas'
                            }`}
                        >
                            <span
                                className={`material-symbols-outlined text-[20px] ${
                                    route().current('profile.edit') ? 'fill-1' : ''
                                }`}
                            >
                                person
                            </span>
                            <span className="text-label-md font-label-md">Profile</span>
                        </Link>
                    </nav>
                </div>

                {/* Bottom Actions in Sidebar */}
                <div className="flex flex-col gap-1 pt-4 border-t border-border-subtle">
                    <button
                        type="button"
                        onClick={() => setIsAiDrawerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-canvas transition-colors text-left cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">
                                auto_awesome
                            </span>
                            <span className="text-label-md font-label-md">Ask Kora</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                            AI
                        </span>
                    </button>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-text-muted hover:text-error hover:bg-error-container/20 transition-colors text-left"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span className="text-label-md font-label-md">Sign Out</span>
                    </Link>
                </div>
            </aside>

            {/* Main View Container */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header Bar */}
                <header className="h-16 bg-surface-card border-b border-border-subtle flex items-center justify-between px-8 shrink-0 sticky top-0 z-30">
                    {/* Left: Breadcrumbs / Header text or Global Search */}
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                        {header ? (
                            header
                        ) : (
                            <form onSubmit={handleGlobalSearch} className="relative w-full">
                                <span className="absolute inset-y-0 left-3 flex items-center text-text-muted pointer-events-none">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search tasks, projects..."
                                    className="w-full h-10 pl-9 pr-12 text-body-md font-body-md rounded-lg border border-border-subtle bg-bg-canvas placeholder:text-text-muted focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <kbd className="px-1.5 py-0.5 text-caption font-caption text-text-muted bg-surface-card border border-border-subtle rounded">
                                        ↵
                                    </kbd>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Right Header Controls */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Interactive Notification Bell & Dropdown */}
                        <div className="relative" ref={notificationDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                aria-label="Notifications"
                                aria-expanded={isNotificationOpen}
                                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                                    isNotificationOpen
                                        ? 'bg-primary-container/10 text-primary'
                                        : 'text-text-muted hover:text-text-primary hover:bg-bg-canvas'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface-card shadow-xs animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Flyout Panel */}
                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-surface-card border border-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                                    {/* Flyout Header */}
                                    <div className="px-4 py-3 bg-surface-card border-b border-border-subtle flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-primary">
                                                notifications
                                            </span>
                                            <h4 className="text-body-md font-bold text-text-primary">
                                                Notifications
                                            </h4>
                                            {unreadCount > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleMarkAllAsRead}
                                                className="text-xs font-semibold text-primary hover:text-accent-hover hover:underline cursor-pointer"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>

                                    {/* Flyout Body / Notification List */}
                                    <div className="max-h-[380px] overflow-y-auto divide-y divide-border-subtle/60">
                                        {activeNotifications.length === 0 ? (
                                            <div className="py-10 px-4 text-center">
                                                <span className="material-symbols-outlined text-4xl text-border-hover mb-2 block">
                                                    notifications_off
                                                </span>
                                                <p className="text-body-sm font-semibold text-text-primary">
                                                    All caught up!
                                                </p>
                                                <p className="text-caption text-text-muted mt-0.5">
                                                    No unread notifications right now.
                                                </p>
                                            </div>
                                        ) : (
                                            activeNotifications.map((item) => {
                                                const isUnread = !readIds.includes(item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleNotificationClick(item)}
                                                        className={`p-3.5 flex items-start gap-3 hover:bg-bg-canvas transition-colors cursor-pointer group relative ${
                                                            isUnread ? 'bg-indigo-50/25' : 'bg-surface-card'
                                                        }`}
                                                    >
                                                        {/* Icon Box */}
                                                        <div
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                                item.type === 'urgent'
                                                                    ? 'bg-rose-100 text-rose-600'
                                                                    : item.type === 'warning'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : item.type === 'priority'
                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                            }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">
                                                                {item.icon || 'notifications'}
                                                            </span>
                                                        </div>

                                                        {/* Notification Details */}
                                                        <div className="flex-1 min-w-0 pr-6">
                                                            <div className="flex items-center gap-1.5">
                                                                <p
                                                                    className={`text-xs font-bold truncate ${
                                                                        isUnread
                                                                            ? 'text-text-primary'
                                                                            : 'text-text-muted'
                                                                    }`}
                                                                >
                                                                    {item.title}
                                                                </p>
                                                                {isUnread && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                                                                {item.message}
                                                            </p>
                                                            <span className="text-[10px] text-text-muted font-medium mt-1 block">
                                                                {item.time}
                                                            </span>
                                                        </div>

                                                        {/* Individual Dismiss Button */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) =>
                                                                handleDismissNotification(e, item.id)
                                                            }
                                                            className="absolute right-2 top-2 p-1 text-text-muted/60 hover:text-text-primary rounded hover:bg-surface-container opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                            title="Dismiss notification"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">
                                                                close
                                                            </span>
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Flyout Footer */}
                                    <div className="p-2.5 bg-bg-canvas/50 border-t border-border-subtle text-center">
                                        <Link
                                            href={route('tasks.index')}
                                            onClick={() => setIsNotificationOpen(false)}
                                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                            <span>View All Tasks</span>
                                            <span className="material-symbols-outlined text-[14px]">
                                                arrow_forward
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-border-subtle"></div>

                        {/* User Profile in top-right */}
                        <Link href={route('profile.edit')} className="flex items-center gap-3 pl-1 group">
                            <div className="w-9 h-9 rounded-full bg-surface-container text-primary font-bold flex items-center justify-center border border-border-subtle text-caption uppercase overflow-hidden shrink-0">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user.name ? user.name.charAt(0) : 'U'
                                )}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-body-md font-body-md font-semibold text-text-primary leading-tight group-hover:text-primary transition-colors">
                                    {user.name}
                                </span>
                                <span className="text-caption font-caption text-text-muted leading-tight">
                                    {user.email}
                                </span>
                            </div>
                        </Link>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto px-8 py-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
                    {children}
                </main>

                {/* Minimal Web Footer */}
                <footer className="w-full py-6 border-t border-border-subtle bg-bg-canvas mt-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center px-8 w-full max-w-7xl mx-auto gap-4">
                        <span className="text-caption font-caption font-semibold text-text-muted">
                            © 2026 Taskora Inc. All rights reserved.
                        </span>
                        <div className="flex items-center gap-6">
                            <a
                                href="#privacy"
                                className="text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors"
                            >
                                Privacy Policy
                            </a>
                            <a
                                href="#terms"
                                className="text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors"
                            >
                                Terms of Service
                            </a>
                            <a
                                href="#help"
                                className="text-body-sm font-body-sm text-text-muted hover:text-text-primary transition-colors"
                            >
                                Help
                            </a>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Global Create Task Modal */}
            <Modal show={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateTask} className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px]">add_task</span>
                            </div>
                            <div>
                                <h3 className="text-title-md font-bold text-text-primary">Create New Task</h3>
                                <p className="text-caption text-text-muted">Add a new task to your dashboard</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsTaskModalOpen(false)}
                            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-canvas transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-label-md font-semibold text-text-primary mb-1">
                                Task Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={modalTitle}
                                onChange={(e) => setModalTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                required
                                className="w-full h-11 px-3.5 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-md font-medium text-text-primary transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-label-md font-semibold text-text-primary mb-1">
                                Description & Notes
                            </label>
                            <textarea
                                value={modalDescription}
                                onChange={(e) => setModalDescription(e.target.value)}
                                rows={3}
                                placeholder="Add context or notes... (Shift + Enter for new lines)"
                                className="w-full px-3.5 py-2.5 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-text-primary transition-all resize-y"
                            />
                        </div>

                        {/* Category & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    value={modalCategory}
                                    onChange={(e) => setModalCategory(e.target.value)}
                                    placeholder="e.g. Work, Study"
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Priority
                                </label>
                                <select
                                    value={modalPriority}
                                    onChange={(e) =>
                                        setModalPriority(e.target.value as 'low' | 'medium' | 'high')
                                    }
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary capitalize transition-all cursor-pointer"
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={modalDueDate}
                                    onChange={(e) => setModalDueDate(e.target.value)}
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Due Time
                                </label>
                                <input
                                    type="time"
                                    value={modalDueTime}
                                    onChange={(e) => setModalDueTime(e.target.value)}
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* Productivity: Checklist Steps Builder */}
                        <div className="pt-3 border-t border-border-subtle">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-label-md font-semibold text-text-primary">
                                    Checklist Steps
                                </label>
                                {modalSubTasks.length > 0 && (
                                    <span className="text-caption font-semibold text-text-muted">
                                        {modalSubTasks.length} step{modalSubTasks.length > 1 ? 's' : ''} added
                                    </span>
                                )}
                            </div>

                            {/* Added steps list */}
                            {modalSubTasks.length > 0 && (
                                <div className="space-y-1.5 mb-2.5 max-h-36 overflow-y-auto pr-1">
                                    {modalSubTasks.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-3 py-1.5 bg-bg-canvas rounded-lg border border-border-subtle text-body-sm group"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="truncate text-text-primary">{step}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveModalSubTask(idx)}
                                                className="text-text-muted hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                                                title="Remove step"
                                            >
                                                <span className="material-symbols-outlined text-[15px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Step Input */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={modalSubTaskInput}
                                    onChange={(e) => setModalSubTaskInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddModalSubTask();
                                        }
                                    }}
                                    placeholder="Add a checklist step... (press Enter)"
                                    className="flex-1 h-9 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                                <button
                                    type="button"
                                    disabled={!modalSubTaskInput.trim()}
                                    onClick={() => handleAddModalSubTask()}
                                    className="h-9 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    <span>Add</span>
                                </button>
                            </div>
                        </div>

                        {/* Productivity: File Attachment Builder */}
                        <div className="pt-3 border-t border-border-subtle">
                            <label className="block text-label-md font-semibold text-text-primary mb-1.5">
                                File Attachment (Optional)
                            </label>

                            {modalAttachment ? (
                                <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/50 border border-indigo-200 rounded-lg">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                                            attach_file
                                        </span>
                                        <span className="text-body-sm font-medium text-text-primary truncate">
                                            {modalAttachment.name}
                                        </span>
                                        <span className="text-caption text-text-muted shrink-0">
                                            ({modalAttachment.size >= 1048576
                                                ? `${(modalAttachment.size / 1048576).toFixed(1)} MB`
                                                : `${Math.round(modalAttachment.size / 1024)} KB`})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveModalFile}
                                        className="text-text-muted hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                        title="Remove attachment"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        ref={modalFileInputRef}
                                        type="file"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleModalFileSelected(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                        id="modal-file-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => modalFileInputRef.current?.click()}
                                        className="h-9 px-3 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-primary text-text-muted hover:text-text-primary rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[16px] text-primary">upload_file</span>
                                        <span>Attach File (Max 10MB)</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={() => setIsTaskModalOpen(false)}
                            className="h-10 px-4 bg-surface-card hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-label-md font-medium transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !modalTitle.trim()}
                            className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-md font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>{isSubmitting ? 'Creating...' : 'Create Task'}</span>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Taskora AI & Support Slide-Over Drawer (Phase 7 - Triggered strictly from Help & Support above Sign Out) */}
            <AiAssistantDrawer
                isOpen={isAiDrawerOpen}
                onClose={() => setIsAiDrawerOpen(false)}
                userName={user?.name || 'User'}
            />
        </div>
    );
}
