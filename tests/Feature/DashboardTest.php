<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_dashboard(): void
    {
        $response = $this->get('/dashboard');

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_sees_accurate_dashboard_metrics(): void
    {
        $user = User::factory()->create();

        // Create tasks for this user
        Task::create([
            'user_id'      => $user->id,
            'title'        => 'Completed Task Today',
            'priority'     => 'high',
            'completed_at' => Carbon::now(),
        ]);

        Task::create([
            'user_id'      => $user->id,
            'title'        => 'Pending Task',
            'priority'     => 'medium',
            'completed_at' => null,
        ]);

        // Create a task for another user to verify CIA isolation
        $otherUser = User::factory()->create();
        Task::create([
            'user_id'      => $otherUser->id,
            'title'        => 'Other User Task',
            'priority'     => 'low',
            'completed_at' => Carbon::now(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('systemNotifications')
            ->has('stats', fn ($stats) => $stats
                ->where('total', 2)
                ->where('completed', 1)
                ->where('pending', 1)
            )
            ->has('weeklyFocus', fn ($focus) => $focus
                ->where('completed_count', 1)
                ->where('goal', 25)
                ->has('days', 5)
                ->etc()
            )
        );
    }
}
