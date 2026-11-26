<?php

namespace App\Console\Commands;

use App\Mail\TaskoraSystemNotification;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMailTransport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test {email? : The recipient email address to send the test message to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email delivery and verify active mail transport configuration';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $recipient = $this->argument('email');

        if (!$recipient) {
            $user = User::first();
            $recipient = $user?->email ?? config('mail.from.address', 'testuser@gmail.com');
        }

        $mailer = config('mail.default');
        $from = config('mail.from.address');
        $name = config('mail.from.name');

        $this->info("--------------------------------------------------");
        $this->info("   Taskora Mail Transport Verification Tool       ");
        $this->info("--------------------------------------------------");
        $this->line("• Active Mailer:     <fg=yellow>{$mailer}</>");
        $this->line("• Sender Name:       <fg=yellow>{$name}</>");
        $this->line("• Sender Address:    <fg=yellow>{$from}</>");
        $this->line("• Recipient:         <fg=yellow>{$recipient}</>");

        if ($mailer === 'smtp') {
            $host = config('mail.mailers.smtp.host');
            $port = config('mail.mailers.smtp.port');
            $scheme = config('mail.mailers.smtp.scheme') ?? ($port == 465 ? 'smtps' : 'smtp (starttls)');
            $this->line("• SMTP Host:         <fg=yellow>{$host}:{$port} ({$scheme})</>");
        }

        $this->newLine();
        $this->comment("Dispatching verification email...");

        try {
            Mail::to($recipient)->send(new TaskoraSystemNotification(
                subjectText: 'Taskora Live Mail Transport Verification',
                messageText: 'Your live mail transport is successfully connected and operational. Password reset notifications and system emails can now be dispatched safely.',
                actionUrl: url('/dashboard'),
                actionText: 'Open Dashboard'
            ));

            $this->info("✔ Verification email dispatched successfully!");

            if ($mailer === 'log') {
                $this->comment("Note: Since MAIL_MAILER=log, the email content was safely written to:");
                $this->line("  <fg=cyan>storage/logs/laravel.log</>");
            } else {
                $this->info("✔ Live message transmitted via [{$mailer}] transport.");
            }

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("✖ Mail transport delivery failed!");
            $this->error("Error: " . $e->getMessage());

            if ($mailer === 'smtp') {
                $this->newLine();
                $this->warn("Troubleshooting SMTP:");
                $this->line("  1. If using Gmail, ensure 2-Step Verification is ON and you are using a 16-character App Password (not your normal account password).");
                $this->line("  2. Ensure MAIL_PORT=587 (STARTTLS) or MAIL_PORT=465 with MAIL_SCHEME=smtps (SSL).");
            }

            return Command::FAILURE;
        }
    }
}
