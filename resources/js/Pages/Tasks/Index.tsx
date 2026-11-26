import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import { playCompletionChime } from '@/Utils/sound';

export interface SubTask {
    id: number;
    title: string;
    is_completed: boolean;
}

export interface Attachment {
    id: number;
    original_name: string;
    file_size: number;
    file_size_formatted?: string;
    mime_type?: string;
    download_url: string;
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    category?: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string | null;
    due_date_raw?: string | null;
    due_time_raw?: string | null;
    due_at_raw?: string | null;
    is_completed: boolean;
    created_at?: string;
    sub_tasks?: SubTask[];
    sub_tasks_count?: number;
    sub_tasks_completed_count?: number;
    attachments?: Attachment[];
    attachments_count?: number;
}

interface Filters {
    filter?: string;
    search?: string;
    sort?: string;
    category?: string;
    priority?: string;
}

export default function TasksIndex({
    initialTasks = [],
    categories = [],
    filters = {},
}: {
    initialTasks?: Task[];
    categories?: string[];
    filters?: Filters;
}) {
    const tasks = Array.isArray(initialTasks) ? initialTasks : [];
    const filterObj = (filters && typeof filters === 'object' && !Array.isArray(filters)) ? (filters as Filters) : {};
    
    // Quick creation bar state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(() => {
        try {
            return (localStorage.getItem('taskora_default_priority') as any) || 'medium';
        } catch {
            return 'medium';
        }
    });
    const [category, setCategory] = useState(() => {
        try {
            return localStorage.getItem('taskora_default_category') || 'General';
        } catch {
            return 'General';
        }
    });
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);

    // Quick creation bar state - productivity features (sub-tasks & attachments)
    const [quickSubTasks, setQuickSubTasks] = useState<string[]>([]);
    const [quickSubTaskInput, setQuickSubTaskInput] = useState('');
    const [showQuickChecklist, setShowQuickChecklist] = useState(false);
    const [quickAttachment, setQuickAttachment] = useState<File | null>(null);
    const quickFileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleAddQuickSubTask = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = quickSubTaskInput.trim();
        if (!text) return;
        setQuickSubTasks((prev) => [...prev, text]);
        setQuickSubTaskInput('');
    };

    const handleRemoveQuickSubTask = (index: number) => {
        setQuickSubTasks((prev) => prev.filter((_, i) => i !== index));
    };

    const handleQuickFileSelected = (file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File exceeds the 10MB maximum limit.');
            return;
        }
        setQuickAttachment(file);
    };

    const handleRemoveQuickFile = () => {
        setQuickAttachment(null);
        if (quickFileInputRef.current) quickFileInputRef.current.value = '';
    };

    // Live search input state
    const [searchQuery, setSearchQuery] = useState(filterObj.search || '');

    // Active filter selections
    const activeFilter = (filterObj.filter || 'all') as 'all' | 'pending' | 'completed';
    const activeCategory = filterObj.category || 'all';
    const activePriority = filterObj.priority || 'all';
    const sortBy = (filterObj.sort || 'due_date') as 'due_date' | 'priority' | 'title';

    // Multi-select state for Bulk Actions
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Single Task Modals
    const [taskToConfirm, setTaskToConfirm] = useState<Task | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    // Edit form fields
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [editDueDate, setEditDueDate] = useState('');
    const [editDueTime, setEditDueTime] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Active task to edit (kept strictly in sync with Inertia props when sub-tasks change)
    const activeTaskToEdit = taskToEdit ? (tasks.find((t) => t.id === taskToEdit.id) ?? taskToEdit) : null;
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
    const [isAddingSubTask, setIsAddingSubTask] = useState(false);

    // Expanded task cards for viewing checklist inline
    const [expandedTaskIds, setExpandedTaskIds] = useState<number[]>([]);
    const [inlineSubTaskInput, setInlineSubTaskInput] = useState<{ [taskId: number]: string }>({});

    // Helper to evaluate due date status for badges
    const getDueStatus = (task: Task) => {
        if (!task.due_date || task.is_completed) return null;
        const today = new Date().toISOString().split('T')[0];
        const dueDateStr = task.due_date_raw || task.due_at_raw;
        if (dueDateStr && dueDateStr < today) return 'overdue';
        if (dueDateStr && dueDateStr === today) return 'due_today';
        return 'upcoming';
    };

    // Sub-task actions
    const handleAddSubTask = (taskId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newSubTaskTitle.trim()) return;

        setIsAddingSubTask(true);
        router.post(
            route('subtasks.store', taskId),
            { title: newSubTaskTitle.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewSubTaskTitle('');
                    setIsAddingSubTask(false);
                },
                onError: () => {
                    setIsAddingSubTask(false);
                },
            }
        );
    };

    const handleToggleSubTask = (subTaskId: number) => {
        playCompletionChime();
        router.patch(
            route('subtasks.toggle', subTaskId),
            {},
            { preserveScroll: true }
        );
    };

    const handleDeleteSubTask = (subTaskId: number) => {
        router.delete(
            route('subtasks.destroy', subTaskId),
            { preserveScroll: true }
        );
    };

    const toggleExpandTask = (taskId: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedTaskIds((prev) =>
            prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
        );
    };

    const handleAddInlineSubTask = (taskId: number, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = (inlineSubTaskInput[taskId] || '').trim();
        if (!text) return;

        router.post(
            route('subtasks.store', taskId),
            { title: text },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setInlineSubTaskInput((prev) => ({ ...prev, [taskId]: '' }));
                },
            }
        );
    };

    // Attachment actions & state
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleUploadAttachment = (taskId: number, file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File exceeds the 10MB maximum limit.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsUploadingAttachment(true);
        router.post(route('attachments.store', taskId), formData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsUploadingAttachment(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onError: () => {
                setIsUploadingAttachment(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleDeleteAttachment = (attachmentId: number) => {
        router.delete(route('attachments.destroy', attachmentId), {
            preserveScroll: true,
        });
    };

    // Dynamic counters
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.is_completed).length;
    const pendingCount = tasks.filter((t) => !t.is_completed).length;

    // Open Edit Modal
    const handleOpenEdit = (task: Task) => {
        setTaskToEdit(task);
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        setEditCategory(task.category || 'General');
        setEditPriority(task.priority || 'medium');
        setEditDueDate(task.due_date_raw || '');
        setEditDueTime(task.due_time_raw || '');
    };

    // Save edited task
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskToEdit || !editTitle.trim()) return;

        setIsSavingEdit(true);

        let combinedDueAt: string | null = null;
        if (editDueDate && editDueTime) {
            combinedDueAt = `${editDueDate} ${editDueTime}:00`;
        } else if (editDueDate) {
            combinedDueAt = `${editDueDate} 23:59:00`;
        } else if (editDueTime) {
            const today = new Date().toISOString().split('T')[0];
            combinedDueAt = `${today} ${editDueTime}:00`;
        }

        router.put(
            route('tasks.update', taskToEdit.id),
            {
                title: editTitle.trim(),
                description: editDescription.trim() || null,
                category: editCategory.trim() || 'General',
                priority: editPriority,
                due_at: combinedDueAt,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSavingEdit(false);
                    setTaskToEdit(null);
                },
                onError: () => {
                    setIsSavingEdit(false);
                },
            }
        );
    };

    // Toggle task completion
    const toggleTask = (id: number) => {
        const target = tasks.find((t) => t.id === id);
        if (target && !target.is_completed) {
            playCompletionChime();
        }
        router.patch(route('tasks.toggle', id), {}, {
            preserveScroll: true,
        });
    };

    // Delete single task
    const deleteTask = (id: number) => {
        router.delete(route('tasks.destroy', id), {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds((prev) => prev.filter((i) => i !== id));
            },
        });
    };

    // Add new task
    const handleAddTask = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title.trim()) return;

        let combinedDueAt: string | null = null;
        if (dueDate && dueTime) {
            combinedDueAt = `${dueDate} ${dueTime}:00`;
        } else if (dueDate) {
            combinedDueAt = `${dueDate} 23:59:00`;
        } else if (dueTime) {
            const today = new Date().toISOString().split('T')[0];
            combinedDueAt = `${today} ${dueTime}:00`;
        }

        router.post(
            route('tasks.store'),
            {
                title: title.trim(),
                description: description.trim() || null,
                category: category || 'General',
                priority: priority,
                due_at: combinedDueAt,
                sub_tasks: quickSubTasks.length > 0 ? quickSubTasks : undefined,
                attachment: quickAttachment || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    setDueDate('');
                    setDueTime('');
                    setCategory('General');
                    setQuickSubTasks([]);
                    setQuickSubTaskInput('');
                    setShowQuickChecklist(false);
                    setQuickAttachment(null);
                    if (quickFileInputRef.current) quickFileInputRef.current.value = '';
                },
            }
        );
    };

    // Query filter updater helper
    const updateQueries = (newParams: Partial<Filters>) => {
        const queryParams: Record<string, string | undefined> = {
            filter: filterObj.filter,
            search: filterObj.search,
            category: filterObj.category,
            priority: filterObj.priority,
            sort: filterObj.sort,
            ...newParams,
        };

        // Clean out undefined or empty values
        Object.keys(queryParams).forEach((key) => {
            if (!queryParams[key] || queryParams[key] === 'all') {
                delete queryParams[key];
            }
        });

        router.get(route('tasks.index'), queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle search submission
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateQueries({ search: searchQuery.trim() || undefined });
    };

    // Clear all filters
    const handleClearAllFilters = () => {
        setSearchQuery('');
        router.get(route('tasks.index'), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const hasActiveFilters = Boolean(
        filterObj.search ||
        (filterObj.filter && filterObj.filter !== 'all') ||
        (filterObj.category && filterObj.category !== 'all') ||
        (filterObj.priority && filterObj.priority !== 'all')
    );

    // Multi-select toggle
    const handleSelectTask = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    // Toggle select all tasks
    const handleToggleSelectAll = () => {
        if (selectedIds.length === tasks.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(tasks.map((t) => t.id));
        }
    };

    // Bulk action dispatch
    const handleBulkAction = (action: 'complete' | 'reopen' | 'delete') => {
        if (selectedIds.length === 0) return;

        router.post(
            route('tasks.bulk'),
            {
                ids: selectedIds,
                action: action,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds([]);
                    setShowBulkDeleteConfirm(false);
                },
            }
        );
    };

    // Cycle sort
    const cycleSort = () => {
        const sorts: ('due_date' | 'priority' | 'title')[] = ['due_date', 'priority', 'title'];
        const next = sorts[(sorts.indexOf(sortBy) + 1) % 3];
        updateQueries({ sort: next });
    };

    // Combine distinct categories from props + 'General'
    const categoryPills = Array.from(new Set(['all', ...categories, 'General']));

    return (
        <AuthenticatedLayout
            pendingTasksCount={pendingCount}
            header={
                <div className="flex items-center gap-2">
                    <span className="text-body-md font-body-md text-text-muted">Taskora</span>
                    <span className="text-caption font-caption text-text-muted">/</span>
                    <span className="text-label-md font-label-md font-semibold text-text-primary">My Tasks</span>
                </div>
            }
        >
            <Head title="My Tasks — Taskora" />

            {/* Top Title and Status Summary Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight font-bold">
                        My Tasks
                    </h1>
                    <p className="text-body-md font-body-md text-text-muted mt-1">
                        Organize, prioritize, and manage your productivity in one place.
                    </p>
                </div>

                {/* Status summary pills */}
                <div className="flex items-center gap-2 bg-surface-card border border-border-subtle rounded-full p-1.5 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary">
                        <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                        <span className="text-label-sm font-label-sm font-semibold">Total: {totalCount}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-badge-pending-bg text-badge-pending-text">
                        <span className="w-2 h-2 rounded-full bg-badge-pending-text"></span>
                        <span className="text-label-sm font-label-sm font-semibold">Pending: {pendingCount}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-badge-completed-bg text-badge-completed-text">
                        <span className="w-2 h-2 rounded-full bg-badge-completed-text"></span>
                        <span className="text-label-sm font-label-sm font-semibold">Completed: {completedCount}</span>
                    </div>
                </div>
            </div>

            {/* Quick Task Creation Card */}
            <section className="bg-surface-card border border-border-subtle rounded-xl p-4 shadow-sm hover:border-border-hover transition-colors">
                <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                    {/* Top: Title Input */}
                    <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-text-muted text-[20px]">
                            add_task
                        </span>
                        <input
                            id="task-title-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What needs to be done? (Title)"
                            className="w-full h-11 pl-10 pr-4 text-body-md font-semibold bg-bg-canvas/50 hover:bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg placeholder:text-text-muted placeholder:font-normal text-text-primary transition-all"
                        />
                    </div>

                    {/* Middle: Description Textarea with Shift+Enter */}
                    <div className="relative">
                        <textarea
                            id="task-description-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add notes, context, or checklist details... (Shift + Enter for new lines)"
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (!e.shiftKey) {
                                        e.preventDefault();
                                        handleAddTask();
                                    }
                                }
                            }}
                            className="w-full px-3.5 py-2.5 bg-bg-canvas/50 hover:bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-text-primary placeholder:text-text-muted transition-all resize-y min-h-[60px]"
                        />
                    </div>

                    {/* Bottom: Metadata Bar & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Category Input */}
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[16px]">
                                    label
                                </span>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Category"
                                    title="Task Category (e.g. Work, Study, Health, Personal)"
                                    className="h-10 pl-8 pr-3 w-28 sm:w-32 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-border-hover focus:border-primary rounded-lg text-text-primary text-label-md font-label-md transition-all text-xs"
                                />
                            </div>

                            {/* Due Date picker */}
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    title="Due Date"
                                    aria-label="Due Date"
                                    className="h-10 px-2.5 sm:px-3 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-border-hover focus:border-primary rounded-lg text-text-primary text-xs font-medium transition-all"
                                />
                            </div>

                            {/* Due Time picker */}
                            <div className="relative">
                                <input
                                    type="time"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                    title="Due Time"
                                    aria-label="Due Time"
                                    className="h-10 px-2 sm:px-3 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-border-hover focus:border-primary rounded-lg text-text-primary text-xs font-medium transition-all"
                                />
                            </div>

                            {/* Priority dropdown button */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                                    className="h-10 px-3.5 flex items-center gap-2 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-border-hover rounded-lg text-text-muted hover:text-text-primary text-label-md font-label-md transition-all"
                                >
                                    <span
                                        className={`material-symbols-outlined text-[18px] ${
                                            priority === 'high'
                                                ? 'text-error'
                                                : priority === 'medium'
                                                ? 'text-badge-pending-text'
                                                : 'text-text-muted'
                                        }`}
                                    >
                                        flag
                                    </span>
                                    <span className="capitalize">{priority}</span>
                                    <span className="material-symbols-outlined text-caption">expand_more</span>
                                </button>

                                {showPriorityMenu && (
                                    <div className="absolute left-0 mt-2 w-36 bg-surface-card border border-border-subtle rounded-xl shadow-lg z-50 py-1">
                                        {(['low', 'medium', 'high'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => {
                                                    setPriority(p);
                                                    setShowPriorityMenu(false);
                                                }}
                                                className="w-full px-3 py-2 text-left text-body-sm font-medium hover:bg-bg-canvas flex items-center gap-2 capitalize"
                                            >
                                                <span
                                                    className={`w-2 h-2 rounded-full ${
                                                        p === 'high'
                                                            ? 'bg-error'
                                                            : p === 'medium'
                                                            ? 'bg-badge-pending-text'
                                                            : 'bg-secondary'
                                                    }`}
                                                ></span>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Checklist Toggle Button */}
                            <button
                                type="button"
                                onClick={() => setShowQuickChecklist(!showQuickChecklist)}
                                className={`h-10 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                    quickSubTasks.length > 0 || showQuickChecklist
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                                        : 'bg-bg-canvas hover:bg-surface-card border-border-subtle hover:border-border-hover text-text-muted hover:text-text-primary'
                                }`}
                                title="Add checklist steps"
                            >
                                <span className="material-symbols-outlined text-[16px]">
                                    {quickSubTasks.length > 0 ? 'task_alt' : 'checklist'}
                                </span>
                                <span>{quickSubTasks.length > 0 ? `${quickSubTasks.length} steps` : 'Checklist'}</span>
                            </button>

                            {/* Quick Attachment Button */}
                            <div className="relative">
                                <input
                                    ref={quickFileInputRef}
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleQuickFileSelected(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                    id="quick-file-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => quickFileInputRef.current?.click()}
                                    className={`h-10 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                        quickAttachment
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                                            : 'bg-bg-canvas hover:bg-surface-card border-border-subtle hover:border-border-hover text-text-muted hover:text-text-primary'
                                    }`}
                                    title="Attach a file (PDF, image, document - max 10MB)"
                                >
                                    <span className="material-symbols-outlined text-[16px]">attach_file</span>
                                    <span className="max-w-[100px] truncate">
                                        {quickAttachment ? quickAttachment.name : 'Attach'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                            <button
                                type="submit"
                                className="h-9 px-4 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-md font-label-md font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] shadow-sm shrink-0 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                <span>Add Task</span>
                            </button>
                        </div>
                    </div>

                    {/* Expanded Checklist Steps Builder in Quick Card */}
                    {(showQuickChecklist || quickSubTasks.length > 0) && (
                        <div className="pt-2.5 pb-1 border-t border-border-subtle/70 flex flex-col gap-2 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs text-text-muted">
                                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[15px] text-primary">checklist</span>
                                    <span>Checklist Steps ({quickSubTasks.length})</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowQuickChecklist(false)}
                                    className="text-text-muted hover:text-text-primary text-[11px] cursor-pointer"
                                >
                                    Hide
                                </button>
                            </div>

                            {quickSubTasks.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {quickSubTasks.map((step, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-canvas border border-border-subtle text-xs text-text-primary"
                                        >
                                            <span className="text-[10px] font-bold text-primary">{idx + 1}.</span>
                                            <span className="truncate max-w-[200px]">{step}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQuickSubTask(idx)}
                                                className="text-text-muted hover:text-rose-600 ml-0.5 cursor-pointer"
                                                title="Remove step"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={quickSubTaskInput}
                                    onChange={(e) => setQuickSubTaskInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddQuickSubTask();
                                        }
                                    }}
                                    placeholder="Add checklist step... (press Enter)"
                                    className="flex-1 h-8 px-2.5 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-xs text-text-primary transition-all"
                                />
                                <button
                                    type="button"
                                    disabled={!quickSubTaskInput.trim()}
                                    onClick={() => handleAddQuickSubTask()}
                                    className="h-8 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    <span>Add Step</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quick Attachment Preview Chip */}
                    {quickAttachment && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs text-text-primary animate-fadeIn">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                                    attach_file
                                </span>
                                <span className="truncate font-medium">{quickAttachment.name}</span>
                                <span className="text-caption text-text-muted shrink-0">
                                    ({quickAttachment.size >= 1048576
                                        ? `${(quickAttachment.size / 1048576).toFixed(1)} MB`
                                        : `${Math.round(quickAttachment.size / 1024)} KB`})
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRemoveQuickFile}
                                className="text-text-muted hover:text-rose-600 p-0.5 ml-2 cursor-pointer"
                                title="Remove attachment"
                            >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                        </div>
                    )}
                </form>
            </section>

            {/* Live Search & Filter Bar Section */}
            <div className="bg-surface-card border border-border-subtle rounded-xl p-3 sm:p-4 shadow-sm flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Live Search Box */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tasks by title or notes..."
                            className="w-full h-10 pl-9 pr-8 bg-bg-canvas/60 hover:bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-text-primary placeholder:text-text-muted transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    updateQueries({ search: undefined });
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                                title="Clear search"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        )}
                    </form>

                    {/* Status Tabs + Sort Dropdown */}
                    <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
                        {/* Status filter tabs */}
                        <div className="flex items-center gap-1 bg-bg-canvas border border-border-subtle rounded-lg p-1 shadow-sm">
                            {(['all', 'pending', 'completed'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => updateQueries({ filter: st })}
                                    className={`px-3 py-1 rounded-md text-label-sm font-semibold capitalize transition-all ${
                                        activeFilter === st
                                            ? 'bg-primary-container text-on-primary shadow-xs'
                                            : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        {/* Priority Filter */}
                        <select
                            value={activePriority}
                            onChange={(e) => updateQueries({ priority: e.target.value })}
                            className="h-9 px-3 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-border-hover rounded-lg text-xs font-medium text-text-primary focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                        </select>

                        {/* Sort Cycle Button */}
                        <button
                            type="button"
                            onClick={cycleSort}
                            className="h-9 px-3 flex items-center gap-1.5 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-border-hover rounded-lg text-text-muted hover:text-text-primary text-xs font-medium transition-all"
                            title="Cycle sort order"
                        >
                            <span className="material-symbols-outlined text-[16px]">sort</span>
                            <span className="capitalize">{sortBy.replace('_', ' ')}</span>
                        </button>

                        {/* Clear All Filters Button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearAllFilters}
                                className="h-9 px-2.5 flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                                title="Reset all filters"
                            >
                                <span className="material-symbols-outlined text-[15px]">filter_alt_off</span>
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border-subtle/60 text-xs">
                    <span className="text-text-muted font-medium flex items-center gap-1 pr-1 shrink-0">
                        <span className="material-symbols-outlined text-[15px]">sell</span>
                        <span>Category:</span>
                    </span>

                    {categoryPills.map((cat) => {
                        const isSelected = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => updateQueries({ category: cat })}
                                className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 capitalize border ${
                                    isSelected
                                        ? 'bg-primary text-white border-primary shadow-xs font-semibold'
                                        : 'bg-bg-canvas text-text-muted hover:text-text-primary border-border-subtle hover:border-border-hover'
                                }`}
                            >
                                {cat === 'all' ? 'All' : cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bulk Action Sticky Bar (Appears when items are selected) */}
            {selectedIds.length > 0 && (
                <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-indigo-900 text-white rounded-xl shadow-lg border border-indigo-700 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white text-indigo-900 text-xs font-bold flex items-center justify-center">
                            {selectedIds.length}
                        </span>
                        <span className="text-body-sm font-semibold">
                            {selectedIds.length} task{selectedIds.length > 1 ? 's' : ''} selected
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleBulkAction('complete')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>Mark Complete</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleBulkAction('reopen')}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            <span>Mark Pending</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>Delete</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-xs font-medium transition-all cursor-pointer"
                        >
                            Deselect All
                        </button>
                    </div>
                </div>
            )}

            {/* Task List Header (Master Select All Trigger) */}
            {tasks.length > 0 && (
                <div className="flex items-center justify-between px-2 pt-1 text-xs text-text-muted">
                    {selectedIds.length === 0 ? (
                        <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-card border border-border-subtle bg-bg-canvas transition-all cursor-pointer shadow-2xs"
                        >
                            <span className="material-symbols-outlined text-[16px] text-text-muted">checklist</span>
                            <span>Select All Tasks</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                                <span>Deselect All ({selectedIds.length})</span>
                            </button>
                            {selectedIds.length < tasks.length && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(tasks.map((t) => t.id))}
                                    className="text-xs text-primary hover:underline font-medium cursor-pointer ml-1"
                                >
                                    Select All ({tasks.length})
                                </button>
                            )}
                        </div>
                    )}

                    <span>Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                </div>
            )}

            {/* Task List Container */}
            <section className="flex flex-col gap-3">
                {tasks.length === 0 ? (
                    <div className="text-center py-12 bg-surface-card border border-border-subtle rounded-xl shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-border-hover mb-3 block">
                            task_alt
                        </span>
                        <h3 className="text-headline-md font-bold text-text-primary">No tasks in this view</h3>
                        <p className="text-body-sm text-text-muted mt-1">
                            {hasActiveFilters
                                ? 'No tasks matched your active search or filters.'
                                : 'Add a task above or switch your filter.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearAllFilters}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-accent-hover transition-all"
                            >
                                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                                <span>Reset Filters</span>
                            </button>
                        )}
                    </div>
                ) : (
                    tasks.map((task) => {
                        const isSelected = selectedIds.includes(task.id);
                        const isExpanded = expandedTaskIds.includes(task.id);
                        const dueStatus = getDueStatus(task);
                        const subTaskCount = task.sub_tasks_count ?? (task.sub_tasks?.length ?? 0);
                        const subTaskCompletedCount = task.sub_tasks_completed_count ?? (task.sub_tasks?.filter((st) => st.is_completed).length ?? 0);
                        const hasSubTasks = subTaskCount > 0;

                        return (
                            <div
                                key={task.id}
                                className={`group flex flex-col bg-surface-card hover:bg-bg-canvas border rounded-xl shadow-sm transition-all duration-150 ${
                                    isSelected
                                        ? 'border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-300'
                                        : 'border-border-subtle hover:border-border-hover'
                                } ${task.is_completed ? 'opacity-80 bg-surface-card/70' : ''}`}
                            >
                                {/* Main Task Row */}
                                <div className="flex items-center justify-between px-4 py-3.5">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Multi-select checkbox: ONLY visible when tasks are selected */}
                                        {selectedIds.length > 0 && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectTask(task.id)}
                                                aria-label={`Select task ${task.title}`}
                                                className="w-4 h-4 rounded border-border-hover text-primary-container focus:ring-primary-container cursor-pointer shrink-0 transition-opacity animate-fadeIn"
                                            />
                                        )}

                                        {/* Single Checkbox Complete button (Always clean & accessible) */}
                                        <button
                                            type="button"
                                            onClick={() => setTaskToConfirm(task)}
                                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all focus:outline-none cursor-pointer ${
                                                task.is_completed
                                                    ? 'bg-tertiary-container text-on-primary shadow-sm'
                                                    : 'border border-border-hover hover:border-primary-container bg-surface-card'
                                            }`}
                                            aria-label={
                                                task.is_completed
                                                    ? 'Mark task as incomplete'
                                                    : 'Mark task as complete'
                                            }
                                        >
                                            {task.is_completed && (
                                                <span className="material-symbols-outlined text-[15px] font-bold fill-1">
                                                    check
                                                </span>
                                            )}
                                        </button>

                                        {/* Task Content (Clickable to Edit) */}
                                        <div
                                            onClick={() => handleOpenEdit(task)}
                                            className="flex flex-col min-w-0 cursor-pointer flex-1 pr-2"
                                            title="Click to edit task"
                                        >
                                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                <span
                                                    className={`text-body-md font-body-md font-medium hover:text-primary transition-colors ${
                                                        task.is_completed
                                                            ? 'line-through text-text-muted'
                                                            : 'text-text-primary'
                                                    }`}
                                                >
                                                    {task.title}
                                                </span>

                                                {task.category && (
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
                                                            task.is_completed
                                                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">
                                                            label
                                                        </span>
                                                        <span>{task.category}</span>
                                                    </span>
                                                )}

                                                {/* Sub-tasks Progress Pill */}
                                                {hasSubTasks && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => toggleExpandTask(task.id, e)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold border transition-all cursor-pointer ${
                                                            subTaskCompletedCount === subTaskCount
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                                        }`}
                                                        title={isExpanded ? 'Hide checklist' : 'Show checklist'}
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">
                                                            {subTaskCompletedCount === subTaskCount ? 'task_alt' : 'checklist'}
                                                        </span>
                                                        <span>{subTaskCompletedCount}/{subTaskCount}</span>
                                                        <span className="material-symbols-outlined text-[13px]">
                                                            {isExpanded ? 'expand_less' : 'expand_more'}
                                                        </span>
                                                    </button>
                                                )}

                                                {/* Attachments Pill */}
                                                {task.attachments_count !== undefined && task.attachments_count > 0 && (
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenEdit(task);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                                                        title={`${task.attachments_count} attachment${task.attachments_count > 1 ? 's' : ''} (Click to view)`}
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">
                                                            attach_file
                                                        </span>
                                                        <span>{task.attachments_count}</span>
                                                    </span>
                                                )}

                                                {/* Mobile Due Badge */}
                                                {task.due_date && (
                                                    <span
                                                        className={`sm:hidden inline-flex items-center gap-1 text-caption font-medium ${
                                                            dueStatus === 'overdue'
                                                                ? 'text-rose-600 font-semibold'
                                                                : dueStatus === 'due_today'
                                                                ? 'text-amber-600 font-semibold'
                                                                : 'text-text-muted'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">
                                                            {dueStatus === 'overdue'
                                                                ? 'error'
                                                                : dueStatus === 'due_today'
                                                                ? 'alarm'
                                                                : 'schedule'}
                                                        </span>
                                                        <span>
                                                            {dueStatus === 'overdue'
                                                                ? 'Overdue'
                                                                : dueStatus === 'due_today'
                                                                ? 'Due Today'
                                                                : task.due_date}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Task Description */}
                                            {task.description && (
                                                <p
                                                    className={`text-body-sm text-text-muted whitespace-pre-wrap mt-1 leading-relaxed ${
                                                        task.is_completed ? 'line-through text-text-muted/60' : ''
                                                    }`}
                                                >
                                                    {task.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side Badges & Controls */}
                                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                        {/* Due Date Desktop Badge */}
                                        {task.due_date ? (
                                            dueStatus === 'overdue' ? (
                                                <div
                                                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
                                                    title="This task is overdue!"
                                                >
                                                    <span className="material-symbols-outlined text-[16px] text-rose-600">
                                                        error
                                                    </span>
                                                    <span>Overdue · {task.due_date}</span>
                                                </div>
                                            ) : dueStatus === 'due_today' ? (
                                                <div
                                                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                                                    title="Due today"
                                                >
                                                    <span className="material-symbols-outlined text-[16px] text-amber-600">
                                                        alarm
                                                    </span>
                                                    <span>Due Today · {task.due_time_raw || task.due_date}</span>
                                                </div>
                                            ) : (
                                                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-border-subtle text-text-muted text-xs font-medium">
                                                    <span className="material-symbols-outlined text-[16px] text-primary">
                                                        schedule
                                                    </span>
                                                    <span className="text-text-primary font-medium">{task.due_date}</span>
                                                </div>
                                            )
                                        ) : (
                                            <span className="hidden md:inline text-caption text-text-muted/60 italic text-xs">
                                                No due date
                                            </span>
                                        )}

                                        {/* Priority Badge */}
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-semibold ${
                                                task.priority === 'high'
                                                    ? 'bg-badge-urgent-bg text-badge-urgent-text'
                                                    : task.priority === 'medium'
                                                    ? 'bg-badge-pending-bg text-badge-pending-text'
                                                    : 'bg-surface-container text-secondary'
                                            }`}
                                        >
                                            {task.priority
                                                ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
                                                : 'Medium'}
                                        </span>

                                        {/* Edit Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(task)}
                                            className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-container/10 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                                            aria-label="Edit task"
                                            title="Edit task & sub-tasks"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>

                                        {/* Delete Trash Icon */}
                                        <button
                                            type="button"
                                            onClick={() => deleteTask(task.id)}
                                            className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:text-error hover:bg-error-container/20 opacity-50 group-hover:opacity-100 transition-all cursor-pointer"
                                            aria-label="Delete task"
                                            title="Delete task"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Collapsible Sub-tasks Checklist Row */}
                                {isExpanded && (
                                    <div className="px-4 pb-3.5 pt-2 border-t border-border-subtle/60 bg-slate-50/50 rounded-b-xl animate-fadeIn">
                                        <div className="pl-8 space-y-2">
                                            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                                                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[15px] text-primary">checklist</span>
                                                    <span>Checklist Steps ({subTaskCompletedCount}/{subTaskCount})</span>
                                                </span>
                                                {subTaskCount > 0 && (
                                                    <span className="text-caption">
                                                        {Math.round((subTaskCompletedCount / subTaskCount) * 100)}% done
                                                    </span>
                                                )}
                                            </div>

                                            {/* Subtask list */}
                                            {task.sub_tasks && task.sub_tasks.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {task.sub_tasks.map((st) => (
                                                        <div
                                                            key={st.id}
                                                            className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-surface-card border border-border-subtle/80 hover:border-border-hover transition-all group/st"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleSubTask(st.id)}
                                                                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                                                                        st.is_completed
                                                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                            : 'border-border-hover hover:border-primary bg-white'
                                                                    }`}
                                                                >
                                                                    {st.is_completed && (
                                                                        <span className="material-symbols-outlined text-[12px] font-bold">
                                                                            check
                                                                        </span>
                                                                    )}
                                                                </button>
                                                                <span
                                                                    className={`text-xs truncate ${
                                                                        st.is_completed
                                                                            ? 'line-through text-text-muted/70'
                                                                            : 'text-text-primary'
                                                                    }`}
                                                                >
                                                                    {st.title}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSubTask(st.id)}
                                                                className="opacity-0 group-hover/st:opacity-100 text-text-muted hover:text-rose-600 p-0.5 rounded transition-all cursor-pointer"
                                                                title="Delete step"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">close</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-caption text-text-muted/70 italic py-0.5">
                                                    No checklist steps yet. Add one below.
                                                </p>
                                            )}

                                            {/* Quick Add Inline Step */}
                                            <form
                                                onSubmit={(e) => handleAddInlineSubTask(task.id, e)}
                                                className="flex items-center gap-2 pt-1"
                                            >
                                                <input
                                                    type="text"
                                                    value={inlineSubTaskInput[task.id] || ''}
                                                    onChange={(e) =>
                                                        setInlineSubTaskInput((prev) => ({
                                                            ...prev,
                                                            [task.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="Add step... (press Enter)"
                                                    className="flex-1 h-8 px-2.5 bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-xs text-text-primary transition-all"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!(inlineSubTaskInput[task.id] || '').trim()}
                                                    className="h-8 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                                    <span>Add</span>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </section>

            {/* Task Edit Slide-over / Modal */}
            <Modal show={taskToEdit !== null} onClose={() => setTaskToEdit(null)} maxWidth="lg">
                <form onSubmit={handleSaveEdit} className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                            </div>
                            <div>
                                <h3 className="text-title-md font-bold text-text-primary">Edit Task</h3>
                                <p className="text-caption text-text-muted">Update task details and timeline</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTaskToEdit(null)}
                            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-canvas transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-label-md font-semibold text-text-primary mb-1" htmlFor="edit-title">
                                Task Title <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="edit-title"
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                required
                                className="w-full h-11 px-3.5 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-md font-medium text-text-primary transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-label-md font-semibold text-text-primary mb-1" htmlFor="edit-desc">
                                Description & Notes
                            </label>
                            <textarea
                                id="edit-desc"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={4}
                                placeholder="Add notes, context, or breakdown... (Shift + Enter for new lines)"
                                className="w-full px-3.5 py-2.5 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-text-primary transition-all resize-y min-h-[90px]"
                            />
                        </div>

                        {/* Category & Priority Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1" htmlFor="edit-category">
                                    Category / Tag
                                </label>
                                <input
                                    id="edit-category"
                                    type="text"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    placeholder="e.g. Work, Study, Health"
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Priority Level
                                </label>
                                <div className="grid grid-cols-3 gap-1.5 h-10">
                                    {(['low', 'medium', 'high'] as const).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setEditPriority(p)}
                                            className={`h-full rounded-lg text-xs font-semibold capitalize flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                                                editPriority === p
                                                    ? p === 'high'
                                                        ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                                                        : p === 'medium'
                                                        ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                                                        : 'bg-slate-200 text-slate-800 border-slate-300 font-bold'
                                                    : 'bg-bg-canvas text-text-muted border-border-subtle hover:bg-surface-card'
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    p === 'high'
                                                        ? 'bg-rose-600'
                                                        : p === 'medium'
                                                        ? 'bg-amber-600'
                                                        : 'bg-slate-500'
                                                }`}
                                            ></span>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Due Date & Due Time Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-label-md font-semibold text-text-primary mb-1">
                                    Due Time
                                </label>
                                <input
                                    type="time"
                                    value={editDueTime}
                                    onChange={(e) => setEditDueTime(e.target.value)}
                                    className="w-full h-10 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* Sub-Tasks / Checklist Section in Edit Modal */}
                        <div className="pt-4 border-t border-border-subtle">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-label-md font-semibold text-text-primary">
                                    Checklist & Sub-Tasks
                                </label>
                                {activeTaskToEdit && (activeTaskToEdit.sub_tasks_count ?? 0) > 0 && (
                                    <span className="text-caption font-semibold text-text-muted">
                                        {activeTaskToEdit.sub_tasks_completed_count ?? 0} of {activeTaskToEdit.sub_tasks_count ?? 0} completed
                                    </span>
                                )}
                            </div>

                            {/* Progress Bar if subtasks exist */}
                            {activeTaskToEdit && (activeTaskToEdit.sub_tasks_count ?? 0) > 0 && (
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-300 rounded-full"
                                        style={{
                                            width: `${Math.round(
                                                ((activeTaskToEdit.sub_tasks_completed_count ?? 0) /
                                                    (activeTaskToEdit.sub_tasks_count || 1)) *
                                                    100
                                            )}%`,
                                        }}
                                    ></div>
                                </div>
                            )}

                            {/* Subtask list */}
                            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                                {activeTaskToEdit?.sub_tasks && activeTaskToEdit.sub_tasks.length > 0 ? (
                                    activeTaskToEdit.sub_tasks.map((st) => (
                                        <div
                                            key={st.id}
                                            className="flex items-center justify-between px-3 py-2 bg-bg-canvas hover:bg-surface-card rounded-lg border border-border-subtle transition-all group/st"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleSubTask(st.id)}
                                                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                                                        st.is_completed
                                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                                            : 'border-border-hover hover:border-primary bg-white'
                                                    }`}
                                                >
                                                    {st.is_completed && (
                                                        <span className="material-symbols-outlined text-[13px] font-bold">
                                                            check
                                                        </span>
                                                    )}
                                                </button>
                                                <span
                                                    className={`text-body-sm truncate ${
                                                        st.is_completed
                                                            ? 'line-through text-text-muted'
                                                            : 'text-text-primary'
                                                    }`}
                                                >
                                                    {st.title}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSubTask(st.id)}
                                                className="text-text-muted hover:text-rose-600 opacity-60 group-hover/st:opacity-100 p-1 rounded transition-colors cursor-pointer"
                                                title="Delete step"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    close
                                                </span>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-caption text-text-muted/70 italic py-1">
                                        No sub-tasks yet. Break this task into smaller steps below.
                                    </p>
                                )}
                            </div>

                            {/* Quick Add Sub-task Input */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newSubTaskTitle}
                                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (activeTaskToEdit) handleAddSubTask(activeTaskToEdit.id);
                                        }
                                    }}
                                    placeholder="Add checklist step and press Enter..."
                                    className="flex-1 h-9 px-3 bg-bg-canvas focus:bg-surface-card border border-border-subtle focus:border-primary rounded-lg text-body-sm text-text-primary transition-all"
                                />
                                <button
                                    type="button"
                                    disabled={!newSubTaskTitle.trim() || isAddingSubTask}
                                    onClick={() => {
                                        if (activeTaskToEdit) handleAddSubTask(activeTaskToEdit.id);
                                    }}
                                    className="h-9 px-3.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    <span>Add Step</span>
                                </button>
                            </div>
                        </div>

                        {/* Attachments Section in Edit Modal */}
                        <div className="pt-4 border-t border-border-subtle">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-label-md font-semibold text-text-primary">
                                    Attachments & Files
                                </label>
                                {activeTaskToEdit && (activeTaskToEdit.attachments_count ?? 0) > 0 && (
                                    <span className="text-caption font-semibold text-text-muted">
                                        {activeTaskToEdit.attachments_count} file{activeTaskToEdit.attachments_count !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Attachment list */}
                            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                                {activeTaskToEdit?.attachments && activeTaskToEdit.attachments.length > 0 ? (
                                    activeTaskToEdit.attachments.map((att) => (
                                        <div
                                            key={att.id}
                                            className="flex items-center justify-between px-3 py-2 bg-bg-canvas hover:bg-surface-card rounded-lg border border-border-subtle transition-all group/att"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                                                    {att.mime_type?.startsWith('image/')
                                                        ? 'image'
                                                        : att.mime_type?.includes('pdf')
                                                        ? 'picture_as_pdf'
                                                        : 'description'}
                                                </span>
                                                <div className="flex flex-col min-w-0 flex-1 pr-2">
                                                    <span className="text-body-sm font-medium text-text-primary truncate">
                                                        {att.original_name}
                                                    </span>
                                                    <span className="text-caption text-text-muted">
                                                        {att.file_size_formatted || `${Math.round(att.file_size / 1024)} KB`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <a
                                                    href={att.download_url}
                                                    download={att.original_name}
                                                    className="p-1 rounded text-text-muted hover:text-primary transition-colors cursor-pointer"
                                                    title="Download file"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        download
                                                    </span>
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                    className="p-1 rounded text-text-muted hover:text-rose-600 opacity-60 group-hover/att:opacity-100 transition-colors cursor-pointer"
                                                    title="Delete file"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        delete
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-caption text-text-muted/70 italic py-1">
                                        No files attached. Upload documents, PDFs, or images below (max 10MB).
                                    </p>
                                )}
                            </div>

                            {/* File upload button */}
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files?.[0] && activeTaskToEdit) {
                                            handleUploadAttachment(activeTaskToEdit.id, e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                    id="task-file-upload"
                                />
                                <button
                                    type="button"
                                    disabled={isUploadingAttachment}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-9 px-3.5 bg-bg-canvas hover:bg-surface-card border border-border-subtle hover:border-primary text-text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-primary">
                                        {isUploadingAttachment ? 'hourglass_empty' : 'upload_file'}
                                    </span>
                                    <span>{isUploadingAttachment ? 'Uploading...' : 'Upload Attachment'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer Controls */}
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-border-subtle">
                        <button
                            type="button"
                            onClick={() => {
                                if (taskToEdit) {
                                    deleteTask(taskToEdit.id);
                                    setTaskToEdit(null);
                                }
                            }}
                            className="px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-label-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            <span>Delete Task</span>
                        </button>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setTaskToEdit(null)}
                                className="h-10 px-4 bg-surface-card hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-label-md font-medium transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingEdit || !editTitle.trim()}
                                className="h-10 px-5 bg-primary-container hover:bg-accent-hover text-on-primary rounded-lg text-label-md font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                {isSavingEdit ? (
                                    <span>Saving...</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Task Completion Confirmation Modal */}
            <Modal show={taskToConfirm !== null} onClose={() => setTaskToConfirm(null)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                                taskToConfirm?.is_completed
                                    ? 'bg-amber-100 text-amber-600'
                                    : 'bg-emerald-100 text-emerald-600'
                            }`}
                        >
                            <span className="material-symbols-outlined text-2xl font-bold">
                                {taskToConfirm?.is_completed ? 'restart_alt' : 'check'}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-title-md font-bold text-text-primary">
                                {taskToConfirm?.is_completed ? 'Reopen Task?' : 'Complete Task?'}
                            </h3>
                            <p className="text-caption text-text-muted">Status confirmation</p>
                        </div>
                    </div>

                    <p className="text-body-sm text-text-muted leading-relaxed mb-6">
                        Are you sure you want to mark{' '}
                        <strong className="text-text-primary font-semibold">
                            "{taskToConfirm?.title}"
                        </strong>{' '}
                        as {taskToConfirm?.is_completed ? 'incomplete (pending)' : 'completed'}?
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setTaskToConfirm(null)}
                            className="h-10 px-4 bg-surface-card hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-label-md font-medium transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (taskToConfirm) {
                                    toggleTask(taskToConfirm.id);
                                    setTaskToConfirm(null);
                                }
                            }}
                            className={`h-10 px-5 text-white rounded-lg text-label-md font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                                taskToConfirm?.is_completed
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base">check</span>
                            <span>
                                {taskToConfirm?.is_completed ? 'Mark as Incomplete' : 'Yes, Complete Task'}
                            </span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Delete Confirmation Modal */}
            <Modal show={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-2xl font-bold">delete_forever</span>
                        </div>
                        <div>
                            <h3 className="text-title-md font-bold text-text-primary">Delete Selected Tasks?</h3>
                            <p className="text-caption text-text-muted">Irreversible action</p>
                        </div>
                    </div>

                    <p className="text-body-sm text-text-muted leading-relaxed mb-6">
                        Are you sure you want to permanently delete{' '}
                        <strong className="text-text-primary font-semibold">
                            {selectedIds.length} selected task{selectedIds.length > 1 ? 's' : ''}
                        </strong>
                        ? This cannot be undone.
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowBulkDeleteConfirm(false)}
                            className="h-10 px-4 bg-surface-card hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-label-md font-medium transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkAction('delete')}
                            className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-label-md font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base">delete</span>
                            <span>Yes, Delete All</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
