<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

/**
 * CIA Triad — Confidentiality & Integrity Policy
 *
 * Ensures that users can only view, update, toggle, or delete
 * tasks that they own. No cross-user data leakage is possible.
 */
class TaskPolicy
{
    /**
     * Determine whether the user can view any models.
     * (Users can always list their own tasks via scoped queries.)
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Task $task): bool
    {
        return $user->id === $task->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        return $user->id === $task->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        return $user->id === $task->user_id;
    }
}
