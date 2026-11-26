<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Task extends Model
{
    use HasFactory;

    /**
     * Bootstrap model events.
     * Cleanly purges physical storage attachment files when a task is deleted.
     */
    protected static function booted(): void
    {
        static::deleting(function (Task $task) {
            $task->attachments()->get()->each->delete();
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'category',
        'priority',
        'due_at',
        'completed_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the task.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the sub-tasks for the task.
     */
    public function subTasks(): HasMany
    {
        return $this->hasMany(SubTask::class)->orderBy('id', 'asc');
    }

    /**
     * Get the attachments for the task.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class)->latest('id');
    }

    /**
     * Check if the task is completed.
     */
    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }
}
