<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class TaskController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the user's tasks.
     * CIA: All queries are scoped strictly to the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Build base query scoped to the authenticated user
        $query = $user->tasks()->with(['subTasks', 'attachments'])->latest('created_at');

        // Filter by status
        if ($request->filled('filter')) {
            match ($request->input('filter')) {
                'pending'   => $query->whereNull('completed_at'),
                'completed' => $query->whereNotNull('completed_at'),
                default     => null,
            };
        }

        // Deep Search across Title and Description (with wildcard escaping)
        if ($request->filled('search')) {
            $rawSearch = trim((string) $request->input('search'));
            $escapedSearch = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $rawSearch);
            $query->where(function ($q) use ($escapedSearch) {
                $q->where('title', 'like', '%' . $escapedSearch . '%')
                  ->orWhere('description', 'like', '%' . $escapedSearch . '%');
            });
        }

        // Filter by category
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        // Filter by priority
        if ($request->filled('priority') && $request->input('priority') !== 'all') {
            $query->where('priority', $request->input('priority'));
        }

        // Sort
        if ($request->filled('sort')) {
            match ($request->input('sort')) {
                'due_date'  => $query->reorder()->orderByRaw('due_at IS NULL, due_at ASC'),
                'priority'  => $query->reorder()->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END"),
                'title'     => $query->reorder()->orderBy('title', 'asc'),
                default     => null,
            };
        }

        $tasks = $query->get()->map(fn (Task $task) => [
            'id'           => $task->id,
            'title'        => $task->title,
            'description'  => $task->description,
            'category'     => $task->category,
            'priority'     => $task->priority,
            'due_date'     => $task->due_at ? $task->due_at->format('M d, Y · g:i A') : null,
            'due_date_raw' => $task->due_at?->format('Y-m-d'),
            'due_time_raw' => $task->due_at?->format('H:i'),
            'due_at_raw'   => $task->due_at?->toDateString(),
            'is_completed' => $task->isCompleted(),
            'created_at'   => $task->created_at->format('M d, Y'),
            'sub_tasks'    => $task->subTasks->map(fn ($st) => [
                'id'           => $st->id,
                'title'        => $st->title,
                'is_completed' => (bool) $st->is_completed,
            ])->values()->all(),
            'sub_tasks_count' => $task->subTasks->count(),
            'sub_tasks_completed_count' => $task->subTasks->where('is_completed', true)->count(),
            'attachments' => $task->attachments->map(fn ($att) => [
                'id'                  => $att->id,
                'original_name'       => $att->original_name,
                'file_size'           => $att->file_size,
                'file_size_formatted' => $att->formatted_size,
                'mime_type'           => $att->mime_type,
                'download_url'        => route('attachments.download', $att->id),
            ])->values()->all(),
            'attachments_count' => $task->attachments->count(),
        ]);

        // Distinct categories for active user
        $categories = $user->tasks()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category')
            ->values()
            ->all();

        return Inertia::render('Tasks/Index', [
            'initialTasks' => $tasks->values()->all(),
            'categories'   => $categories,
            'filters'      => (object) $request->only(['filter', 'search', 'sort', 'category', 'priority']),
        ]);
    }

    /**
     * Store a newly created task.
     * CIA: Task is automatically attached to the authenticated user.
     */
    public function store(Request $request)
    {
        $maxKb = (int) config('taskora.max_attachment_size_kb', 10240);

        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string|max:5000',
            'category'     => 'nullable|string|max:100',
            'priority'     => 'required|in:low,medium,high',
            'due_at'       => 'nullable|date',
            'sub_tasks'    => 'nullable|array',
            'sub_tasks.*'  => 'nullable|string|max:255',
            'attachment'   => "nullable|file|max:{$maxKb}|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,rtf,jpg,jpeg,png,webp,gif,svg,zip,tar,gz",
        ]);

        $task = $request->user()->tasks()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'category'    => $validated['category'] ?? 'General',
            'priority'    => $validated['priority'],
            'due_at'      => $validated['due_at'] ?? null,
        ]);

        // Attach sub-tasks if provided during task creation
        if (!empty($validated['sub_tasks'])) {
            foreach ($validated['sub_tasks'] as $subTaskTitle) {
                $trimmed = trim($subTaskTitle);
                if ($trimmed !== '') {
                    $task->subTasks()->create([
                        'title'        => $trimmed,
                        'is_completed' => false,
                    ]);
                }
            }
        }

        // Attach file if provided during task creation
        if ($request->hasFile('attachment')) {
            $uploadedFile = $request->file('attachment');
            $storedPath   = $uploadedFile->store('attachments', 'local');

            $task->attachments()->create([
                'original_name' => $uploadedFile->getClientOriginalName(),
                'storage_path'  => $storedPath,
                'file_size'     => $uploadedFile->getSize(),
                'mime_type'     => $uploadedFile->getMimeType(),
            ]);
        }

        return back()->with('success', 'Task created successfully.');
    }

    /**
     * Update the specified task.
     * CIA: Policy authorization ensures ownership.
     */
    public function update(Request $request, Task $task)
    {
        Gate::authorize('update', $task);

        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string|max:5000',
            'category'     => 'nullable|string|max:100',
            'priority'     => 'required|in:low,medium,high',
            'due_at'       => 'nullable|date',
            'is_completed' => 'nullable|boolean',
        ]);

        $updateData = [
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'category'    => $validated['category'] ?? 'General',
            'priority'    => $validated['priority'],
            'due_at'      => $validated['due_at'] ?? null,
        ];

        if (array_key_exists('is_completed', $validated)) {
            $updateData['completed_at'] = $validated['is_completed'] ? ($task->completed_at ?? Carbon::now()) : null;
        }

        $task->update($updateData);

        return back()->with('success', 'Task updated successfully.');
    }

    /**
     * Toggle the completion status of the specified task.
     * CIA: Policy authorization ensures ownership.
     */
    public function toggle(Task $task)
    {
        Gate::authorize('update', $task);

        $task->update([
            'completed_at' => $task->isCompleted() ? null : Carbon::now(),
        ]);

        return back()->with('success', $task->isCompleted() ? 'Task marked as complete.' : 'Task marked as pending.');
    }

    /**
     * Remove the specified task.
     * CIA: Policy authorization ensures ownership.
     */
    public function destroy(Task $task)
    {
        Gate::authorize('delete', $task);

        $task->delete();

        return back()->with('success', 'Task deleted successfully.');
    }

    /**
     * Perform bulk actions on multiple tasks.
     * CIA: Strict user-scoping prevents tampering with other users' records.
     */
    public function bulk(Request $request)
    {
        $validated = $request->validate([
            'ids'    => 'required|array|min:1|max:100',
            'ids.*'  => 'integer|distinct',
            'action' => 'required|in:complete,reopen,delete',
        ]);

        $query = $request->user()->tasks()->whereIn('id', $validated['ids']);

        match ($validated['action']) {
            'complete' => $query->whereNull('completed_at')->update(['completed_at' => Carbon::now()]),
            'reopen'   => $query->whereNotNull('completed_at')->update(['completed_at' => null]),
            'delete'   => $query->get()->each->delete(),
        };

        $message = match ($validated['action']) {
            'complete' => 'Selected tasks marked as completed.',
            'reopen'   => 'Selected tasks marked as pending.',
            'delete'   => 'Selected tasks deleted successfully.',
        };

        return back()->with('success', $message);
    }
}
