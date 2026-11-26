<?php

namespace App\Http\Controllers;

use App\Models\SubTask;
use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SubTaskController extends Controller
{
    use AuthorizesRequests;

    /**
     * Store a newly created sub-task.
     * CIA: Strictly authorized via parent task ownership.
     */
    public function store(Request $request, Task $task)
    {
        Gate::authorize('update', $task);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $task->subTasks()->create([
            'title'        => $validated['title'],
            'is_completed' => false,
        ]);

        return back()->with('success', 'Sub-task added successfully.');
    }

    /**
     * Toggle the completed status of a sub-task.
     * CIA: Strictly authorized via parent task ownership.
     */
    public function toggle(SubTask $subTask)
    {
        Gate::authorize('update', $subTask->task);

        $subTask->update([
            'is_completed' => !$subTask->is_completed,
        ]);

        return back()->with('success', 'Sub-task status updated.');
    }

    /**
     * Remove a sub-task.
     * CIA: Strictly authorized via parent task ownership.
     */
    public function destroy(SubTask $subTask)
    {
        Gate::authorize('update', $subTask->task);

        $subTask->delete();

        return back()->with('success', 'Sub-task deleted successfully.');
    }
}
