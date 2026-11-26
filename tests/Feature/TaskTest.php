<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_tasks(): void
    {
        $response = $this->get('/tasks');
        $response->assertRedirect('/login');
    }

    public function test_user_can_view_their_own_tasks(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Task::create([
            'user_id'  => $user->id,
            'title'    => 'My Private Task',
            'priority' => 'high',
            'category' => 'Work',
        ]);

        Task::create([
            'user_id'  => $otherUser->id,
            'title'    => 'Other User Task',
            'priority' => 'low',
            'category' => 'Secret',
        ]);

        $response = $this->actingAs($user)->get('/tasks');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tasks/Index')
            ->has('initialTasks', 1)
            ->where('initialTasks.0.title', 'My Private Task')
            ->has('categories')
        );
    }

    public function test_user_can_create_a_task(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/tasks', [
            'title'       => 'New Feature Implementation',
            'description' => 'Add multi-select and edit modal',
            'category'    => 'Engineering',
            'priority'    => 'high',
            'due_at'      => '2026-11-15 14:00:00',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('tasks', [
            'user_id'  => $user->id,
            'title'    => 'New Feature Implementation',
            'category' => 'Engineering',
            'priority' => 'high',
        ]);
    }

    public function test_user_can_update_their_own_task(): void
    {
        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Initial Title',
            'priority' => 'low',
            'category' => 'General',
        ]);

        $response = $this->actingAs($user)->put("/tasks/{$task->id}", [
            'title'        => 'Updated Title',
            'description'  => 'Updated notes',
            'category'     => 'Work',
            'priority'     => 'high',
            'is_completed' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $task->refresh();
        $this->assertEquals('Updated Title', $task->title);
        $this->assertEquals('Work', $task->category);
        $this->assertEquals('high', $task->priority);
        $this->assertTrue($task->isCompleted());
    }

    public function test_cia_user_cannot_update_another_users_task(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $task = Task::create([
            'user_id'  => $userB->id,
            'title'    => 'User B Secret Task',
            'priority' => 'high',
        ]);

        $response = $this->actingAs($userA)->put("/tasks/{$task->id}", [
            'title'    => 'Hacked Title',
            'priority' => 'low',
        ]);

        $response->assertForbidden();
        $task->refresh();
        $this->assertEquals('User B Secret Task', $task->title);
    }

    public function test_cia_user_cannot_delete_another_users_task(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $task = Task::create([
            'user_id'  => $userB->id,
            'title'    => 'User B Task',
            'priority' => 'medium',
        ]);

        $response = $this->actingAs($userA)->delete("/tasks/{$task->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
    }

    public function test_user_can_toggle_task_completion(): void
    {
        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Task to toggle',
            'priority' => 'medium',
        ]);

        $this->assertFalse($task->isCompleted());

        $this->actingAs($user)->patch("/tasks/{$task->id}/toggle");
        $task->refresh();
        $this->assertTrue($task->isCompleted());

        $this->actingAs($user)->patch("/tasks/{$task->id}/toggle");
        $task->refresh();
        $this->assertFalse($task->isCompleted());
    }

    public function test_bulk_actions_only_affect_authenticated_users_tasks(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskA1 = Task::create(['user_id' => $userA->id, 'title' => 'Task A1', 'priority' => 'medium']);
        $taskA2 = Task::create(['user_id' => $userA->id, 'title' => 'Task A2', 'priority' => 'high']);
        $taskB  = Task::create(['user_id' => $userB->id, 'title' => 'Task B', 'priority' => 'low']);

        // Bulk complete
        $response = $this->actingAs($userA)->post('/tasks/bulk', [
            'ids'    => [$taskA1->id, $taskA2->id, $taskB->id],
            'action' => 'complete',
        ]);

        $response->assertSessionHasNoErrors();
        $taskA1->refresh();
        $taskA2->refresh();
        $taskB->refresh();

        $this->assertTrue($taskA1->isCompleted());
        $this->assertTrue($taskA2->isCompleted());
        // User B's task remains untouched!
        $this->assertFalse($taskB->isCompleted());

        // Bulk delete
        $this->actingAs($userA)->post('/tasks/bulk', [
            'ids'    => [$taskA1->id, $taskB->id],
            'action' => 'delete',
        ]);

        $this->assertDatabaseMissing('tasks', ['id' => $taskA1->id]);
        $this->assertDatabaseHas('tasks', ['id' => $taskB->id]);
    }

    public function test_search_and_filters(): void
    {
        $user = User::factory()->create();

        Task::create([
            'user_id'     => $user->id,
            'title'       => 'Alpha Project',
            'description' => 'Important details',
            'category'    => 'Work',
            'priority'    => 'high',
        ]);

        Task::create([
            'user_id'     => $user->id,
            'title'       => 'Beta Task',
            'description' => 'Random notes with Alpha keyword',
            'category'    => 'Personal',
            'priority'    => 'low',
        ]);

        Task::create([
            'user_id'     => $user->id,
            'title'       => 'Gamma Task',
            'description' => 'No match',
            'category'    => 'Health',
            'priority'    => 'medium',
        ]);

        // Deep search matches title OR description
        $response = $this->actingAs($user)->get('/tasks?search=Alpha');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('initialTasks', 2)
        );

        // Category filter
        $response = $this->actingAs($user)->get('/tasks?category=Work');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('initialTasks', 1)
            ->where('initialTasks.0.category', 'Work')
        );

        // Priority filter
        $response = $this->actingAs($user)->get('/tasks?priority=high');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('initialTasks', 1)
            ->where('initialTasks.0.priority', 'high')
        );
    }

    public function test_user_can_create_task_with_subtasks(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/tasks', [
            'title'     => 'Task with Steps',
            'priority'  => 'medium',
            'sub_tasks' => [
                'Step 1: Planning',
                'Step 2: Execution',
                'Step 3: Review',
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $task = Task::where('title', 'Task with Steps')->first();
        $this->assertNotNull($task);
        $this->assertEquals(3, $task->subTasks()->count());
        $this->assertDatabaseHas('sub_tasks', [
            'task_id' => $task->id,
            'title'   => 'Step 1: Planning',
        ]);
    }

    public function test_user_can_create_task_with_attachment(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $file = UploadedFile::fake()->create('brief.pdf', 300, 'application/pdf');

        $response = $this->actingAs($user)->post('/tasks', [
            'title'      => 'Task with Attachment',
            'priority'   => 'high',
            'attachment' => $file,
        ]);

        $response->assertSessionHasNoErrors();

        $task = Task::where('title', 'Task with Attachment')->first();
        $this->assertNotNull($task);
        $this->assertEquals(1, $task->attachments()->count());

        $attachment = $task->attachments()->first();
        $this->assertEquals('brief.pdf', $attachment->original_name);
        Storage::disk('local')->assertExists($attachment->storage_path);
    }

    public function test_bulk_complete_does_not_overwrite_completed_at_on_already_completed_tasks(): void
    {
        $user = User::factory()->create();
        $pastCompletedAt = now()->subDays(10);

        $taskAlreadyDone = Task::create([
            'user_id' => $user->id,
            'title' => 'Already Done Last Week',
            'priority' => 'low',
            'completed_at' => $pastCompletedAt,
        ]);

        $taskPending = Task::create([
            'user_id' => $user->id,
            'title' => 'Pending Task',
            'priority' => 'high',
            'completed_at' => null,
        ]);

        $response = $this->actingAs($user)->post('/tasks/bulk', [
            'ids' => [$taskAlreadyDone->id, $taskPending->id],
            'action' => 'complete',
        ]);

        $response->assertSessionHasNoErrors();
        $taskAlreadyDone->refresh();
        $taskPending->refresh();

        // The already done task must PRESERVE its original completed_at timestamp
        $this->assertEquals($pastCompletedAt->toDateTimeString(), $taskAlreadyDone->completed_at->toDateTimeString());
        // The pending task was newly marked completed
        $this->assertNotNull($taskPending->completed_at);
    }
}
