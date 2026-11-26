<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SubTaskController;
use App\Http\Controllers\TaskAttachmentController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Taskora Application Routes
| CIA: All authenticated routes use 'auth' middleware to enforce session-based
| user isolation. Task routes additionally use controller-level Policy checks.
|
*/

// Guest landing: redirect to dashboard if logged in, or show login
Route::get('/', function () {
    return redirect()->route('login');
});

// Authenticated routes
Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard (real stats from DashboardController)
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // Task CRUD routes
    Route::get('/tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::post('/tasks/bulk', [TaskController::class, 'bulk'])->name('tasks.bulk');
    Route::put('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::patch('/tasks/{task}/toggle', [TaskController::class, 'toggle'])->name('tasks.toggle');
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

    // Sub-task routes
    Route::post('/tasks/{task}/sub-tasks', [SubTaskController::class, 'store'])->name('subtasks.store');
    Route::patch('/sub-tasks/{subTask}/toggle', [SubTaskController::class, 'toggle'])->name('subtasks.toggle');
    Route::delete('/sub-tasks/{subTask}', [SubTaskController::class, 'destroy'])->name('subtasks.destroy');

    // Task Attachment routes
    Route::post('/tasks/{task}/attachments', [TaskAttachmentController::class, 'store'])->name('attachments.store');
    Route::get('/attachments/{attachment}/download', [TaskAttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/attachments/{attachment}', [TaskAttachmentController::class, 'destroy'])->name('attachments.destroy');

    // AI Assistant & Support routes (Phase 7 - Rate limited to 30 requests/min)
    Route::middleware(['throttle:30,1'])->group(function () {
        Route::get('/ai/status', [\App\Http\Controllers\AiAssistantController::class, 'status'])->name('ai.status');
        Route::post('/ai/chat', [\App\Http\Controllers\AiAssistantController::class, 'chat'])->name('ai.chat');
        Route::post('/ai/stream', [\App\Http\Controllers\AiAssistantController::class, 'stream'])->name('ai.stream');
        Route::post('/ai/quick-create', [\App\Http\Controllers\AiAssistantController::class, 'quickCreate'])->name('ai.quick-create');
    });

    // Profile routes (from Breeze)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::delete('/profile/avatar', [ProfileController::class, 'destroyAvatar'])->name('profile.avatar.destroy');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Settings route
    Route::get('/settings', function () {
        return Inertia::render('Settings/Index');
    })->name('settings.index');
});

require __DIR__.'/auth.php';
