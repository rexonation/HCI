<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * Display the user's dashboard with real task metrics.
     * CIA: All queries are scoped strictly to the authenticated user.
     */
    public function __invoke(Request $request)
    {
        $user = $request->user();

        // Get lifetime stats
        $total     = $user->tasks()->count();
        $completed = $user->tasks()->whereNotNull('completed_at')->count();
        $pending   = $total - $completed;

        // Get today's pending tasks (due today or no due date, not completed)
        $todayTasks = $user->tasks()
            ->with('subTasks')
            ->whereNull('completed_at')
            ->orderByRaw('due_at IS NULL, due_at ASC')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->limit(5)
            ->get()
            ->map(fn (Task $task) => [
                'id'           => $task->id,
                'title'        => $task->title,
                'description'  => $task->description,
                'category'     => $task->category,
                'priority'     => $task->priority,
                'due_date'     => $task->due_at ? $task->due_at->format('M d, Y · g:i A') : null,
                'due_date_raw' => $task->due_at?->format('Y-m-d'),
                'due_time_raw' => $task->due_at?->format('H:i'),
                'is_completed' => false,
                'sub_tasks_count' => $task->subTasks->count(),
                'sub_tasks_completed_count' => $task->subTasks->where('is_completed', true)->count(),
            ]);

        // Compute real Weekly Focus metrics for the authenticated user (Monday through Friday 5-day sprint)
        $now         = Carbon::now(config('app.timezone', 'Asia/Manila'));
        $startOfWeek = $now->copy()->startOfWeek(); // Monday 00:00:00
        $endOfSprint = $startOfWeek->copy()->addDays(4)->endOfDay(); // Friday 23:59:59

        // Count completed tasks strictly within the Mon-Fri sprint window matching the 5 chart bars
        $weeklyCompletedCount = $user->tasks()
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$startOfWeek, $endOfSprint])
            ->count();

        // Query daily completions for Monday through Friday
        $dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        $dailyCounts = $user->tasks()
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$startOfWeek, $endOfSprint])
            ->selectRaw('DATE(completed_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $weeklyDays = [];
        for ($i = 0; $i < 5; $i++) {
            $dayDate = $startOfWeek->copy()->addDays($i);
            $dateStr = $dayDate->toDateString();
            $weeklyDays[] = [
                'day'      => $dayNames[$i],
                'date'     => $dateStr,
                'count'    => (int) ($dailyCounts[$dateStr] ?? 0),
                'is_today' => $dayDate->isToday(),
            ];
        }

        // Calculate dynamic weekly sprint progress status
        $weeklyGoal = (int) ($user->weekly_goal ?? config('taskora.weekly_goal', 25));
        $dayOfWeekIso = min(5, max(1, $now->dayOfWeekIso)); // 1 for Mon, up to 5 for Fri
        $expectedByToday = round(($weeklyGoal / 5) * $dayOfWeekIso);

        if ($weeklyCompletedCount >= $weeklyGoal) {
            $statusText = 'Goal Met';
            $statusType = 'success';
        } elseif ($weeklyCompletedCount === 0) {
            $statusText = 'No Progress';
            $statusType = 'neutral';
        } elseif ($weeklyCompletedCount >= $expectedByToday) {
            $statusText = 'On Track';
            $statusType = 'success';
        } else {
            $statusText = 'Behind Pace';
            $statusType = 'warning';
        }

        return Inertia::render('Dashboard', [
            'tasks' => $todayTasks->values()->all(),
            'stats' => [
                'total'     => $total,
                'completed' => $completed,
                'pending'   => $pending,
            ],
            'weeklyFocus' => [
                'days'            => $weeklyDays,
                'completed_count' => $weeklyCompletedCount,
                'goal'            => $weeklyGoal,
                'status_text'     => $statusText,
                'status_type'     => $statusType,
            ],
        ]);
    }
}
