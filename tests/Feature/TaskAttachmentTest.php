<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaskAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_attachment_to_their_task(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Design Task',
            'priority' => 'high',
        ]);

        $file = UploadedFile::fake()->create('wireframe.pdf', 500, 'application/pdf');

        $response = $this->actingAs($user)->post("/tasks/{$task->id}/attachments", [
            'file' => $file,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('task_attachments', [
            'task_id'       => $task->id,
            'original_name' => 'wireframe.pdf',
        ]);

        $attachment = TaskAttachment::where('task_id', $task->id)->first();
        Storage::disk('local')->assertExists($attachment->storage_path);
    }

    public function test_user_can_download_their_attachment(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Design Task',
            'priority' => 'medium',
        ]);

        $file = UploadedFile::fake()->create('specs.txt', 100, 'text/plain');
        $path = $file->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id'       => $task->id,
            'original_name' => 'specs.txt',
            'storage_path'  => $path,
            'file_size'     => 102400,
            'mime_type'     => 'text/plain',
        ]);

        $response = $this->actingAs($user)->get("/attachments/{$attachment->id}/download");

        $response->assertOk();
    }

    public function test_user_can_delete_their_attachment(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Design Task',
            'priority' => 'low',
        ]);

        $file = UploadedFile::fake()->create('draft.png', 200, 'image/png');
        $path = $file->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id'       => $task->id,
            'original_name' => 'draft.png',
            'storage_path'  => $path,
            'file_size'     => 204800,
            'mime_type'     => 'image/png',
        ]);

        $response = $this->actingAs($user)->delete("/attachments/{$attachment->id}");

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('task_attachments', ['id' => $attachment->id]);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_cia_user_cannot_upload_attachment_to_another_users_task(): void
    {
        Storage::fake('local');

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskB = Task::create([
            'user_id'  => $userB->id,
            'title'    => 'User B Task',
            'priority' => 'medium',
        ]);

        $file = UploadedFile::fake()->create('malicious.exe', 100);

        $response = $this->actingAs($userA)->post("/tasks/{$taskB->id}/attachments", [
            'file' => $file,
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('task_attachments', ['original_name' => 'malicious.exe']);
    }

    public function test_cia_user_cannot_download_another_users_attachment(): void
    {
        Storage::fake('local');

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskB = Task::create([
            'user_id'  => $userB->id,
            'title'    => 'User B Task',
            'priority' => 'medium',
        ]);

        $file = UploadedFile::fake()->create('secret.pdf', 100);
        $path = $file->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id'       => $taskB->id,
            'original_name' => 'secret.pdf',
            'storage_path'  => $path,
            'file_size'     => 1024,
            'mime_type'     => 'application/pdf',
        ]);

        $response = $this->actingAs($userA)->get("/attachments/{$attachment->id}/download");

        $response->assertForbidden();
    }

    public function test_cia_user_cannot_delete_another_users_attachment(): void
    {
        Storage::fake('local');

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $taskB = Task::create([
            'user_id'  => $userB->id,
            'title'    => 'User B Task',
            'priority' => 'medium',
        ]);

        $file = UploadedFile::fake()->create('important.pdf', 100);
        $path = $file->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id'       => $taskB->id,
            'original_name' => 'important.pdf',
            'storage_path'  => $path,
            'file_size'     => 1024,
            'mime_type'     => 'application/pdf',
        ]);

        $response = $this->actingAs($userA)->delete("/attachments/{$attachment->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('task_attachments', ['id' => $attachment->id]);
    }

    public function test_deleting_task_cascades_attachments_deletion(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Task with attachment',
            'priority' => 'high',
        ]);

        $file = UploadedFile::fake()->create('auto_delete.pdf', 100);
        $path = $file->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id'       => $task->id,
            'original_name' => 'auto_delete.pdf',
            'storage_path'  => $path,
            'file_size'     => 500,
            'mime_type'     => 'application/pdf',
        ]);

        Storage::disk('local')->assertExists($path);

        $task->delete();

        $this->assertDatabaseMissing('task_attachments', ['id' => $attachment->id]);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_bulk_delete_cleans_up_attachment_files_on_disk(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $task = Task::create([
            'user_id'  => $user->id,
            'title'    => 'Task with bulk attachment',
            'priority' => 'high',
        ]);

        $file = UploadedFile::fake()->create('bulk_delete.pdf', 100);
        $path = $file->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id'       => $task->id,
            'original_name' => 'bulk_delete.pdf',
            'storage_path'  => $path,
            'file_size'     => 500,
            'mime_type'     => 'application/pdf',
        ]);

        Storage::disk('local')->assertExists($path);

        $response = $this->actingAs($user)->post('/tasks/bulk', [
            'ids' => [$task->id],
            'action' => 'delete',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('task_attachments', ['id' => $attachment->id]);
        Storage::disk('local')->assertMissing($path);
    }
}
