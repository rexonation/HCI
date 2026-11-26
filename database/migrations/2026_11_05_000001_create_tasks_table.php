<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('category', 100)->default('General');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->datetime('due_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // CIA: Index for user-scoped queries, filtering, and sorting
            $table->index(['user_id', 'completed_at']);
            $table->index(['user_id', 'due_at']);
            $table->index(['user_id', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
