<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default across all Inertia pages.
     * CIA: Notifications are strictly scoped to the authenticated user.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'systemNotifications' => fn () => $this->resolveNotifications($user),
        ];
    }

    /**
     * Efficiently resolve notifications for the active user in a single indexed query.
     */
    protected function resolveNotifications(?\App\Models\User $user): array
    {
        if (!$user) {
            return [];
        }

        $now = Carbon::now(config('app.timezone', 'Asia/Manila'));
        $endOfDay = $now->copy()->endOfDay();

        // Single consolidated query fetching alert candidates: overdue, due today, or high priority pending
        $alertTasks = $user->tasks()
            ->whereNull('completed_at')
            ->where(function ($q) use ($endOfDay) {
                $q->where('due_at', '<=', $endOfDay)
                  ->orWhere('priority', 'high');
            })
            ->orderByRaw('due_at IS NULL, due_at ASC')
            ->limit(10)
            ->get();

        $notifications = [];

        foreach ($alertTasks as $task) {
            if ($task->due_at && $task->due_at->isPast()) {
                $notifications[] = [
                    'id'         => 'overdue_' . $task->id,
                    'type'       => 'urgent',
                    'title'      => 'Task Overdue: ' . $task->title,
                    'message'    => 'Deadline passed ' . $task->due_at->diffForHumans() . ' (' . $task->due_at->format('M d, g:i A') . ')',
                    'time'       => $task->due_at->diffForHumans(),
                    'icon'       => 'error',
                    'action_url' => route('tasks.index', ['search' => $task->title]),
                ];
            } elseif ($task->due_at && $task->due_at->isToday()) {
                $notifications[] = [
                    'id'         => 'today_' . $task->id,
                    'type'       => 'warning',
                    'title'      => 'Due Today: ' . $task->title,
                    'message'    => 'Scheduled for ' . $task->due_at->format('g:i A') . ' (' . $task->due_at->diffForHumans() . ')',
                    'time'       => $task->due_at->diffForHumans(),
                    'icon'       => 'schedule',
                    'action_url' => route('tasks.index', ['search' => $task->title]),
                ];
            } elseif ($task->priority === 'high') {
                $notifications[] = [
                    'id'         => 'priority_' . $task->id,
                    'type'       => 'priority',
                    'title'      => 'High Priority Task: ' . $task->title,
                    'message'    => 'Flagged as high priority in ' . ($task->category ?? 'General'),
                    'time'       => $task->created_at->diffForHumans(),
                    'icon'       => 'flag',
                    'action_url' => route('tasks.index', ['search' => $task->title]),
                ];
            }
        }

        if (empty($notifications)) {
            $notifications[] = [
                'id'         => 'system_welcome',
                'type'       => 'info',
                'title'      => 'All caught up!',
                'message'    => 'You have no overdue or high-priority tasks right now. Great job!',
                'time'       => 'Today',
                'icon'       => 'check_circle',
                'action_url' => route('tasks.index'),
            ];
        }

        return $notifications;
    }
}
