<?php

namespace Database\Seeders;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     * Safe to run in both local development and production.
     */
    public function run(): void
    {
        // 1. Create or retrieve the permanent Test User
        $user = User::firstOrCreate(
            ['email' => 'testuser@gmail.com'],
            [
                'name'              => 'Test User',
                'password'          => Hash::make('password'),
                'email_verified_at' => Carbon::now(),
            ]
        );

        // Always ensure password is known ('password') and email is verified
        $user->update([
            'password'          => Hash::make('password'),
            'email_verified_at' => $user->email_verified_at ?? Carbon::now(),
        ]);

        // 2. Populate starter tasks if user has none
        if ($user->tasks()->count() === 0) {
            $welcomeTask = $user->tasks()->create([
                'title'        => 'Welcome to Taskora! 🎉',
                'description'  => 'Your all-in-one productivity hub. Everything you need to organize your goals, sprints, and checklists.',
                'category'     => 'General',
                'priority'     => 'high',
                'due_at'       => Carbon::now()->addDays(2),
                'completed_at' => null,
            ]);

            $welcomeTask->subTasks()->createMany([
                ['title' => 'Explore the Dashboard metrics gauge', 'is_completed' => true],
                ['title' => 'Create a sub-task checklist item', 'is_completed' => false],
                ['title' => 'Attach a file or document to a task', 'is_completed' => false],
            ]);

            $user->tasks()->create([
                'title'        => 'Review Weekly Sprint Goals',
                'description'  => 'Check the Mon-Fri dynamic focus chart to track daily task completions toward the weekly goal.',
                'category'     => 'Work',
                'priority'     => 'medium',
                'due_at'       => Carbon::now()->addDays(4),
                'completed_at' => null,
            ]);

            $user->tasks()->create([
                'title'        => 'Organize Weekly Study & Work Schedule',
                'description'  => 'Map out deliverables, prioritize upcoming deadlines, and plan daily focus blocks.',
                'category'     => 'Planning',
                'priority'     => 'medium',
                'due_at'       => Carbon::yesterday(),
                'completed_at' => Carbon::yesterday(),
            ]);
        }

        // Ensure all database IDs start at 1 and are cleanly compacted
        \Illuminate\Support\Facades\Artisan::call('db:reset-ids');
    }
}

