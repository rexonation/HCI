<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_user_can_upload_profile_avatar(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('profile.jpg', 400, 400)->size(500);

        $response = $this
            ->actingAs($user)
            ->post('/profile/avatar', [
                'avatar' => $file,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status', 'avatar-updated')
            ->assertRedirect('/profile');

        $user->refresh();
        $this->assertNotNull($user->avatar);
        Storage::disk('public')->assertExists($user->avatar);
        $this->assertNotNull($user->avatar_url);
    }

    public function test_avatar_upload_validates_file_type_and_size(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();

        // 1. Invalid file type (e.g. text file disguised or pdf)
        $invalidFile = UploadedFile::fake()->create('document.pdf', 100);
        $res1 = $this->actingAs($user)->post('/profile/avatar', [
            'avatar' => $invalidFile,
        ]);
        $res1->assertSessionHasErrors('avatar');

        // 2. Exceeds 2MB (2048 KB)
        $largeFile = UploadedFile::fake()->image('huge.png')->size(3000);
        $res2 = $this->actingAs($user)->post('/profile/avatar', [
            'avatar' => $largeFile,
        ]);
        $res2->assertSessionHasErrors('avatar');
    }

    public function test_user_can_delete_avatar_and_revert_to_initials(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('profile.jpg');
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        Storage::disk('public')->assertExists($path);

        $response = $this
            ->actingAs($user)
            ->delete('/profile/avatar');

        $response
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status', 'avatar-deleted')
            ->assertRedirect('/profile');

        $user->refresh();
        $this->assertNull($user->avatar);
        $this->assertNull($user->avatar_url);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_user_deletion_cleans_up_avatar_and_all_task_attachments_on_disk(): void
    {
        Storage::fake('public');
        Storage::fake('local');

        $user = User::factory()->create();

        // 1. User has an avatar
        $avatarFile = UploadedFile::fake()->image('me.jpg');
        $avatarPath = $avatarFile->store('avatars', 'public');
        $user->update(['avatar' => $avatarPath]);
        Storage::disk('public')->assertExists($avatarPath);

        // 2. User has a task with an attachment
        $task = \App\Models\Task::create([
            'user_id' => $user->id,
            'title' => 'Project with attachment',
            'priority' => 'high',
        ]);
        $attFile = UploadedFile::fake()->create('project.pdf', 200, 'application/pdf');
        $attPath = $attFile->store('attachments', 'local');
        $attachment = \App\Models\TaskAttachment::create([
            'task_id' => $task->id,
            'original_name' => 'project.pdf',
            'storage_path' => $attPath,
            'file_size' => 200,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('local')->assertExists($attPath);

        // 3. User deletes account
        $response = $this->actingAs($user)->delete('/profile', [
            'password' => 'password',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseMissing('task_attachments', ['id' => $attachment->id]);

        // 4. Physical files on public and local disks must be cleaned up
        Storage::disk('public')->assertMissing($avatarPath);
        Storage::disk('local')->assertMissing($attPath);
    }
}
