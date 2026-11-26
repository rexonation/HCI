<?php

namespace Tests\Feature;

use App\Mail\TaskoraSystemNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MailTransportTest extends TestCase
{
    use RefreshDatabase;

    public function test_mail_test_command_dispatches_system_notification_mail(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'dev@taskora.local']);

        $this->artisan('mail:test', ['email' => 'dev@taskora.local'])
            ->expectsOutputToContain('Taskora Mail Transport Verification Tool')
            ->expectsOutputToContain('Verification email dispatched successfully!')
            ->assertExitCode(0);

        Mail::assertSent(TaskoraSystemNotification::class, function ($mail) {
            return $mail->hasTo('dev@taskora.local') &&
                   $mail->subjectText === 'Taskora Live Mail Transport Verification';
        });
    }

    public function test_system_notification_mailable_renders_branded_html(): void
    {
        $mailable = new TaskoraSystemNotification(
            subjectText: 'Account Security Notice',
            messageText: 'Your password was recently modified.',
            actionUrl: 'http://localhost:8000/profile',
            actionText: 'Review Profile'
        );

        $html = $mailable->render();

        $this->assertStringContainsString('Taskora', $html);
        $this->assertStringContainsString('Account Security Notice', $html);
        $this->assertStringContainsString('Your password was recently modified.', $html);
        $this->assertStringContainsString('http://localhost:8000/profile', $html);
        $this->assertStringContainsString('Review Profile', $html);
    }
}
