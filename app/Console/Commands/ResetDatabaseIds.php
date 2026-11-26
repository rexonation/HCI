<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetDatabaseIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:reset-ids {--force : Force the operation to run without interactive confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Renumber all database primary keys consecutively starting from 1 and reset AUTO_INCREMENT across all tables';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (!app()->environment('local')) {
            $this->error('This command can only be executed in a local development environment.');
            return Command::FAILURE;
        }

        if (DB::getDriverName() !== 'mysql') {
            $this->error('This command is designed specifically for MySQL databases.');
            return Command::FAILURE;
        }

        if (!$this->option('force') && !$this->confirm('Renumbering primary keys will directly alter database rows. Do you wish to continue?', false)) {
            $this->warn('Operation cancelled.');
            return Command::SUCCESS;
        }

        $this->info('Starting database ID compaction and AUTO_INCREMENT reset...');

        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        try {
            // 1. Renumber Users and update foreign keys
            $users = DB::table('users')->orderBy('id')->get();
            $userMap = [];
            $newUserId = 1;
            foreach ($users as $user) {
                $userMap[$user->id] = $newUserId;
                DB::table('users')->where('id', $user->id)->update(['id' => $newUserId]);
                $newUserId++;
            }

            foreach ($userMap as $oldUid => $newUid) {
                DB::table('tasks')->where('user_id', $oldUid)->update(['user_id' => $newUid]);
                DB::table('sessions')->where('user_id', $oldUid)->update(['user_id' => $newUid]);
            }

            // 2. Renumber Tasks and update dependent child tables
            $tasks = DB::table('tasks')->orderBy('id')->get();
            $taskMap = [];
            $newTaskId = 1;
            foreach ($tasks as $task) {
                $taskMap[$task->id] = $newTaskId;
                DB::table('tasks')->where('id', $task->id)->update(['id' => $newTaskId]);
                $newTaskId++;
            }

            foreach ($taskMap as $oldTid => $newTid) {
                DB::table('sub_tasks')->where('task_id', $oldTid)->update(['task_id' => $newTid]);
                DB::table('task_attachments')->where('task_id', $oldTid)->update(['task_id' => $newTid]);
            }

            // 3. Renumber Sub-tasks
            $subTasks = DB::table('sub_tasks')->orderBy('id')->get();
            $newSubTaskId = 1;
            foreach ($subTasks as $st) {
                DB::table('sub_tasks')->where('id', $st->id)->update(['id' => $newSubTaskId]);
                $newSubTaskId++;
            }

            // 4. Renumber Task Attachments
            $attachments = DB::table('task_attachments')->orderBy('id')->get();
            $newAttId = 1;
            foreach ($attachments as $att) {
                DB::table('task_attachments')->where('id', $att->id)->update(['id' => $newAttId]);
                $newAttId++;
            }

            // 5. Reset AUTO_INCREMENT on all tables to next available ID
            DB::statement("ALTER TABLE users AUTO_INCREMENT = {$newUserId}");
            $this->info("✓ users: " . count($users) . " rows renumbered (1 to " . ($newUserId - 1) . "), next AUTO_INCREMENT = {$newUserId}");

            DB::statement("ALTER TABLE tasks AUTO_INCREMENT = {$newTaskId}");
            $this->info("✓ tasks: " . count($tasks) . " rows renumbered (1 to " . ($newTaskId - 1) . "), next AUTO_INCREMENT = {$newTaskId}");

            DB::statement("ALTER TABLE sub_tasks AUTO_INCREMENT = {$newSubTaskId}");
            $this->info("✓ sub_tasks: " . count($subTasks) . " rows renumbered (1 to " . ($newSubTaskId - 1) . "), next AUTO_INCREMENT = {$newSubTaskId}");

            DB::statement("ALTER TABLE task_attachments AUTO_INCREMENT = {$newAttId}");
            $this->info("✓ task_attachments: " . count($attachments) . " rows renumbered, next AUTO_INCREMENT = {$newAttId}");

            $this->info('Database IDs successfully compacted and AUTO_INCREMENT reset!');
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1');
        }

        return Command::SUCCESS;
    }
}
