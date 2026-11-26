import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { playCompletionChime } from '@/Utils/sound';

interface Task {
    id: number;
    title: string;
    description?: string;
    category?: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string | null;
    due_date_raw?: string | null;
    due_time_raw?: string | null;
    is_completed: boolean;
    sub_tasks_count?: number;
    sub_tasks_completed_count?: number;
}

interface WeeklyDay {
    day: string;
    date: string;
    count: number;
    is_today: boolean;
}

interface WeeklyFocus {
    days: WeeklyDay[];
    completed_count: number;
    goal: number;
    status_text: string;
    status_type: 'success' | 'warning' | 'neutral';
}

export default function Dashboard({
    tasks = [],
    stats = { total: 0, completed: 0, pending: 0 },
    weeklyFocus = {
        days: [
            { day: 'Mon', date: '', count: 0, is_today: false },
            { day: 'Tue', date: '', count: 0, is_today: false },
            { day: 'Wed', date: '', count: 0, is_today: false },
            { day: 'Thu', date: '', count: 0, is_today: false },
            { day: 'Fri', date: '', count: 0, is_today: false },
        ],
        completed_count: 0,
        goal: 25,
        status_text: 'No Progress',
        status_type: 'neutral',
    },
}: {
    tasks?: Task[];
    stats?: { total: number; completed: number; pending: number };
    weeklyFocus?: WeeklyFocus;
}) {
    const auth = (usePage().props as any)?.auth;
    const user = auth?.user || { name: 'User', email: '' };
    const [taskToConfirm, setTaskToConfirm] = useState<Task | null>(null);

    // Calculate percentage completed
    const completionPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    // Get today's formatted date
    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });

    // Toggle task completion via backend
    const toggleTask = (id: number) => {
        const target = tasks.find((t) => t.id === id);
        if (target && !target.is_completed) {
            playCompletionChime();
        }
        router.patch(route('tasks.toggle', id), {}, {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            pendingTasksCount={stats.pending}
            header={
                <div className="flex items-center gap-2">
                    <span className="text-body-md font-body-md text-text-muted">Taskora</span>
                    <span className="text-caption font-caption text-text-muted">/</span>
                    <span className="text-label-md font-label-md font-semibold text-text-primary">Dashboard</span>
                </div>
            }
        >
            <Head title="Dashboard — Taskora" />

            {/* Greeting Header & Context */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-headline-xl font-headline-xl text-text-primary tracking-tight font-bold">
                        Good day, {user.name.split(' ')[0]}!
                    </h1>
                    <p className="text-body-md font-body-md text-text-muted mt-1">
                        Stay organized and accomplish your daily goals.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('taskora:open-task-modal'))}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-container hover:bg-accent-hover text-on-primary rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        title="Create new task with checklist & attachments"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>Add Task</span>
                    </button>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-surface-card border border-border-subtle rounded-full shadow-sm text-text-primary">
                        <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                        <span className="text-label-sm font-label-sm font-medium">{todayFormatted}</span>
                    </div>
                </div>
            </section>

            {/* Metric Summary Row (3 Equal-Width Grid Cards) */}
            <section aria-label="Summary Metrics" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total Tasks */}
                <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-sm hover:border-border-hover transition-all">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-caption font-caption text-text-muted uppercase tracking-wider font-semibold">Total Tasks</span>
                            <div className="text-headline-xl font-headline-xl text-text-primary mt-1 font-bold">{stats.total}</div>
                            <p className="text-body-sm font-body-sm text-text-muted mt-0.5">tasks active</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-caption bg-surface-container-low text-primary font-semibold">
                            <span className="material-symbols-outlined text-xs">trending_up</span>
                            Active
                        </span>
                    </div>
                    <div className="mt-4 w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-primary-container h-full rounded-full transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Card 2: Completed Tasks */}
                <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-sm hover:border-border-hover transition-all">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-caption font-caption text-text-muted uppercase tracking-wider font-semibold">Completed</span>
                            <div className="text-headline-xl font-headline-xl text-badge-completed-text mt-1 font-bold">{stats.completed}</div>
                            <p className="text-body-sm font-body-sm text-text-muted mt-0.5">of {stats.total} done</p>
                        </div>
                        {/* Circular Progress Gauge */}
                        <div className="relative flex items-center justify-center w-12 h-12">
                            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-surface-container"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                />
                                <path
                                    className="text-badge-completed-text transition-all duration-500"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeDasharray={`${completionPercentage}, 100`}
                                    strokeLinecap="round"
                                    strokeWidth="3.5"
                                />
                            </svg>
                            <span className="absolute text-caption font-caption font-semibold text-text-primary">
                                {completionPercentage}%
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-badge-completed-text h-full rounded-full transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Card 3: Pending Tasks */}
                <div className="bg-surface-card border border-border-subtle rounded-xl p-5 shadow-sm hover:border-border-hover transition-all">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-caption font-caption text-text-muted uppercase tracking-wider font-semibold">Pending</span>
                            <div className="text-headline-xl font-headline-xl text-text-primary mt-1 font-bold">{stats.pending}</div>
                            <p className="text-body-sm font-body-sm text-text-muted mt-0.5">remaining</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-caption bg-badge-pending-bg text-badge-pending-text font-semibold">
                            Needs attention
                        </span>
                    </div>
                    <div className="mt-4 w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-badge-pending-text h-full rounded-full transition-all duration-300"
                            style={{ width: stats.total > 0 ? `${(stats.pending / stats.total) * 100}%` : '0%' }}
                        ></div>
                    </div>
                </div>
            </section>

            {/* Main Layout Bento Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Tasks Flow & Interaction (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Today's Tasks Component Panel */}
                    <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                            <div className="flex items-center gap-2">
                                <h2 className="text-headline-md font-headline-md text-text-primary font-bold">Pending Agenda</h2>
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-container-high text-primary text-caption font-caption font-semibold">
                                    {stats.pending}
                                </span>
                            </div>
                            <Link
                                href={route('tasks.index')}
                                className="text-label-sm font-label-sm text-primary hover:text-accent-hover font-semibold transition-colors flex items-center gap-1"
                            >
                                View All
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </Link>
                        </div>

                        {/* Task List Elements */}
                        <div className="space-y-3 pt-5">
                            {tasks.length === 0 ? (
                                <div className="text-center py-8 text-text-muted">
                                    <span className="material-symbols-outlined text-4xl text-border-hover mb-2 block">task_alt</span>
                                    <p className="text-body-md font-medium">No tasks yet!</p>
                                    <p className="text-caption text-text-muted mt-1">Use the + Add Task button to create your first task.</p>
                                </div>
                            ) : (
                                tasks.slice(0, 5).map((task) => (
                                    <div
                                        key={task.id}
                                        className="group flex items-center justify-between p-3.5 rounded-lg border border-border-subtle hover:bg-bg-canvas hover:border-border-hover transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <button
                                                type="button"
                                                onClick={() => setTaskToConfirm(task)}
                                                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all focus:outline-none cursor-pointer ${
                                                    task.is_completed
                                                        ? 'bg-tertiary-container text-on-primary shadow-sm'
                                                        : 'border border-border-hover hover:border-primary-container bg-surface-card'
                                                }`}
                                                aria-label={task.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                                            >
                                                {task.is_completed && (
                                                    <span className="material-symbols-outlined text-[15px] font-bold fill-1">check</span>
                                                )}
                                            </button>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-body-md font-body-md font-medium truncate ${task.is_completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                                    {task.title}
                                                </span>
                                                {task.description && (
                                                    <p className={`text-caption font-caption text-text-muted line-clamp-1 mt-0.5 whitespace-pre-wrap ${task.is_completed ? 'line-through text-text-muted/60' : ''}`}>
                                                        {task.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {task.category && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
                                                            task.is_completed 
                                                                ? 'bg-slate-100 text-slate-500 border-slate-200' 
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-[13px]">label</span>
                                                            <span>{task.category}</span>
                                                        </span>
                                                    )}
                                                    {task.sub_tasks_count !== undefined && task.sub_tasks_count > 0 && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold ${
                                                            task.sub_tasks_completed_count === task.sub_tasks_count
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-[13px]">
                                                                {task.sub_tasks_completed_count === task.sub_tasks_count ? 'task_alt' : 'checklist'}
                                                            </span>
                                                            <span>{task.sub_tasks_completed_count}/{task.sub_tasks_count} steps</span>
                                                        </span>
                                                    )}
                                                    {task.due_date && (() => {
                                                        const today = new Date().toISOString().split('T')[0];
                                                        const isOverdue = task.due_date_raw && task.due_date_raw < today;
                                                        const isToday = task.due_date_raw && task.due_date_raw === today;

                                                        return (
                                                            <span className={`text-caption font-caption flex items-center gap-1 ${
                                                                isOverdue
                                                                    ? 'text-rose-600 font-semibold'
                                                                    : isToday
                                                                    ? 'text-amber-600 font-semibold'
                                                                    : 'text-text-muted'
                                                            }`}>
                                                                <span className="material-symbols-outlined text-xs">
                                                                    {isOverdue ? 'error' : isToday ? 'alarm' : 'schedule'}
                                                                </span>
                                                                <span>{isOverdue ? 'Overdue · ' : isToday ? 'Due Today · ' : ''}{task.due_date}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-caption font-semibold ${
                                                task.priority === 'high'
                                                    ? 'bg-badge-urgent-bg text-badge-urgent-text'
                                                    : task.priority === 'medium'
                                                    ? 'bg-badge-pending-bg text-badge-pending-text'
                                                    : 'bg-surface-container-low text-secondary'
                                            }`}>
                                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Helpful Tip Card */}
                    <div className="bg-surface-container-low border border-border-subtle rounded-xl p-5 flex items-start gap-3.5">
                        <div className="p-2 rounded-lg bg-surface-card border border-border-subtle text-primary shrink-0">
                            <span className="material-symbols-outlined text-xl">lightbulb</span>
                        </div>
                        <div>
                            <h3 className="text-title-sm font-title-sm text-text-primary font-bold">Helpful Productivity Tip</h3>
                            <p className="text-body-sm font-body-sm text-text-muted mt-0.5 leading-relaxed">
                                Break large tasks into 25-minute Pomodoro sprints. Tackle high-priority deliverables early in the morning when mental fatigue is lowest.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Focus & Motivation (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Weekly Focus Card & Activity Chart */}
                    <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-title-sm font-title-sm text-text-primary font-bold">Weekly Focus</h3>
                                <p className="text-caption font-caption text-text-muted">Sprint performance tracker</p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-caption font-semibold ${
                                weeklyFocus.status_type === 'success'
                                    ? 'bg-badge-completed-bg text-badge-completed-text'
                                    : weeklyFocus.status_type === 'warning'
                                    ? 'bg-badge-pending-bg text-badge-pending-text'
                                    : 'bg-slate-100 text-slate-600'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    weeklyFocus.status_type === 'success'
                                        ? 'bg-badge-completed-text'
                                        : weeklyFocus.status_type === 'warning'
                                        ? 'bg-badge-pending-text'
                                        : 'bg-slate-400'
                                }}`}></span>
                                {weeklyFocus.status_text}
                            </span>
                        </div>

                        {/* Mon-Fri Real Bar Visualization */}
                        {(() => {
                            const maxWeeklyCount = Math.max(1, ...weeklyFocus.days.map((d) => d.count));
                            return (
                                <div className="flex items-end justify-between h-40 pt-4 px-2 border-b border-border-subtle">
                                    {weeklyFocus.days.map((day) => {
                                        const heightStyle = day.count > 0 
                                            ? `${Math.max(20, Math.round((day.count / maxWeeklyCount) * 100))}%`
                                            : '6px';
                                        return (
                                            <div key={day.day} className="flex flex-col items-center gap-2 h-full justify-end w-9">
                                                <span className={`text-caption font-caption ${
                                                    day.is_today && day.count > 0
                                                        ? 'font-semibold text-primary'
                                                        : day.count > 0
                                                        ? 'text-text-primary font-medium'
                                                        : 'text-text-muted/50'
                                                }`}>
                                                    {day.count > 0 ? day.count : '-'}
                                                </span>
                                                <div
                                                    className={`w-full rounded-t-md transition-all duration-300 ${
                                                        day.is_today
                                                            ? day.count > 0
                                                                ? 'bg-primary-container shadow-sm'
                                                                : 'bg-primary/25 border-t-2 border-primary'
                                                            : day.count > 0
                                                            ? 'bg-surface-container-high hover:bg-primary-container/80'
                                                            : 'bg-surface-container-low'
                                                    }`}
                                                    style={{ height: heightStyle }}
                                                    title={`${day.day}: ${day.count} tasks completed`}
                                                ></div>
                                                <span className={`text-caption font-caption pt-1 ${
                                                    day.is_today
                                                        ? 'font-bold text-primary'
                                                        : 'text-text-muted'
                                                }`}>
                                                    {day.day}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                        <div className="mt-4 flex items-center justify-between text-body-sm font-body-sm text-text-muted">
                            <span>Goal: {weeklyFocus.goal} tasks / week</span>
                            <span className="font-medium text-text-primary">
                                {weeklyFocus.completed_count}/{weeklyFocus.goal} completed
                            </span>
                        </div>
                    </div>

                    {/* Daily Motivation Card */}
                    <div className="bg-surface-card border border-border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 text-surface-container-high/60 pointer-events-none select-none">
                            <span className="material-symbols-outlined text-8xl">format_quote</span>
                        </div>
                        <div className="relative z-10 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-primary">
                                <span className="material-symbols-outlined text-base">auto_awesome</span>
                                <span className="text-label-sm font-label-sm font-semibold uppercase tracking-wider">Daily Motivation</span>
                            </div>
                            <blockquote className="text-body-md font-body-md text-text-primary italic leading-relaxed">
                                "Action is the foundational key to all success. Focus not on the mountains ahead, but on the single step you take today."
                            </blockquote>
                            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle/80">
                                <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center text-primary text-caption font-caption font-bold">
                                    P
                                </div>
                                <span className="text-caption font-caption font-medium text-text-muted">Pablo Picasso</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Completion Confirmation Modal */}
            <Modal show={taskToConfirm !== null} onClose={() => setTaskToConfirm(null)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                            taskToConfirm?.is_completed 
                                ? 'bg-amber-100 text-amber-600' 
                                : 'bg-emerald-100 text-emerald-600'
                        }`}>
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
                        Are you sure you want to mark <strong className="text-text-primary font-semibold">"{taskToConfirm?.title}"</strong> as {taskToConfirm?.is_completed ? 'incomplete (pending)' : 'completed'}?
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setTaskToConfirm(null)}
                            className="h-10 px-4 bg-surface-card hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-label-md font-medium transition-all"
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
                            <span>{taskToConfirm?.is_completed ? 'Mark as Incomplete' : 'Yes, Complete Task'}</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
