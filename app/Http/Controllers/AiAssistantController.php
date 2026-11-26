<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiAssistantController extends Controller
{
    /**
     * Return AI integration status and active provider.
     */
    public function status(Request $request): JsonResponse
    {
        $hasKey = !empty(config('services.gemini.key'));

        return response()->json([
            'is_configured' => $hasKey,
            'provider' => $hasKey ? 'Google Gemini 3.5 Flash Lite' : 'Kora Built-in Intelligence',
            'model' => config('services.gemini.model', 'gemini-3.5-flash-lite'),
        ]);
    }

    /**
     * Check if user message attempts to probe confidential system internals or other users' data.
     * Strict CIA Triad Confidentiality Enforcement.
     */
    public function isConfidentialityViolation(string $message): bool
    {
        $lower = strtolower($message);

        // Allow legitimate help inquiries about user security settings and user guides
        $safeQuestions = [
            'how to change password',
            'change my password',
            'change password',
            'update my password',
            'update password',
            'reset password',
            'security features',
            'what is cia',
            'what is the cia triad',
            'how is my data protected',
            'is my data safe',
            'what is this whole system about',
            'what is the whole system about',
            'what is this system about',
            'what is the system about',
            'what is this app about',
            'what is this app',
            'what is this project',
            'what is taskora',
            'about taskora',
            'how does taskora work',
            'how to use taskora',
            'how do i use taskora',
        ];
        foreach ($safeQuestions as $safe) {
            if (str_contains($lower, $safe)) {
                return false;
            }
        }

        $violationPatterns = [
            // Probing database passwords, server keys, hashes, credentials, env
            '/\b(db\s*password|database\s*password|root\s*password|admin\s*password|password\s*(hash|list|of\s+user)|(system|server|database|root|admin)\s*credentials?|(dump|leak|steal|reveal)\s+\w*\s*credentials?|app[_\s]?key|\.env\b|gemini[_\s]?(api[_\s]?)?key|api[_\s]?key|bcrypt\s*salt|session_token|csrf_token)\b/i',
            // Probing database structure, system tables, or destructive queries
            '/\b(table\s*names?|column\s*names?|sql\s*dump|information_schema|show\s+tables|grant\s+.*to|select\s+.*from\s+users|drop\s+table|delete\s+from\s+users)\b/i',
            // System access, admin access, backend access
            '/\b(give\s*me\s*(the\s*)?(database|admin|root|system|backend|server)\s*access|grant\s*access|admin\s*privileges?|access\s*(to\s*)?(the\s*)?database)\b/i',
            // How the system was made, tools used to build it, source code, internal architecture
            '/\b(how\s*(did\s*you|was\s*this|were\s*you|was\s*it|is\s*this|is\s*it)\s*(make|made|built?|create[d]?|develop(ed)?))\b/i',
            '/\b(how\s*(did\s*you|was\s*this|were\s*you|was\s*it)\s*(make|build|create)\s*(this|the|it)\b)/i',
            '/\b(who\s*(made|built?|created|developed)\s*(this|you|taskora|the\s*system|the\s*app)\b)/i',
            '/\b(what\s*(tools?|technolog(y|ies)|stack|frameworks?|languages?|libraries)\s*(did\s*you|were|was|are)?\s*(use[d]?|utilize[d]?)\b)/i',
            '/\b(what\s*(was|is)\s*(the\s*)?tools?\s*used\b)/i',
            '/\b(what\s*did\s*you\s*use\s*to\s*(make|build|create|develop)\b)/i',
            '/\b(what\s*was\s*used\s*to\s*(make|build|create|develop)\b)/i',
            '/\b(tech\s*stack|source\s*code|dump\s*code|controller\s*code|routes?\.php|phpinfo|c:\\\\laragon|\/var\/www|artisan\s*command|exec\(|system32|powershell|cmd\.exe|backend\s*code|server\s*code)\b/i',
            // Other users or global accounts enumeration
            '/\b(list\s+(all|other)\s+users|show\s+all\s+(users|accounts)|(other|all)\s+users?(\'s)?\s+(passwords?|data|tasks|records)|user\s*id\s*\d+|bob\'?s\s*task|alice\'?s\s*task)\b/i',
            // Prompt injections / jailbreaks
            '/\b(ignore\s+(all\s+)?(previous\s+)?instructions|system\s*prompt|system\s*instructions|dan\s*mode|developer\s*mode|jailbreak|bypass\s*(rules|safety|security)|unrestricted\s*mode)\b/i',
        ];

        foreach ($violationPatterns as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Standardized security boundary refusal response.
     */
    public function getConfidentialityRefusalResponse(): array
    {
        return [
            'reply' => "🛡️ **Confidentiality & Security Boundary**\n\n"
                . "I am **Kora**, your personal productivity assistant. I only have access to help you with your own personal tasks, to-dos, priorities, and checklists.\n\n"
                . "I do not have access to or knowledge of:\n"
                . "- How this system was built, who created it, or its source code\n"
                . "- Server credentials, keys, or configurations\n"
                . "- Other users' accounts, tasks, or private data\n\n"
                . "*How can I assist you with your personal goals and to-do list today?*",
            'suggestions' => [
                'What should I prioritize today?',
                'Break down a goal into subtasks',
                'Summarize my weekly performance',
                'Show my task list',
            ],
            'source' => 'security_guardrail',
        ];
    }

    /**
     * Stream real-time AI responses using Server-Sent Events (SSE).
     * CIA: Strictly queries only the authenticated user's tasks.
     * Enforces strict confidentiality boundaries (IAS).
     */
    public function stream(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1500',
            'action' => 'nullable|string|in:chat,breakdown,weekly_summary,prioritize,help',
        ]);

        $user = $request->user();
        $message = trim($validated['message']);
        $action = $validated['action'] ?? 'chat';

        return response()->stream(function () use ($user, $message, $action) {
            @set_time_limit(60);
            @ini_set('zlib.output_compression', '0');
            @ini_set('output_buffering', 'off');
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            ob_implicit_flush(true);

            // 1. Check Confidentiality Guardrail (IAS CIA Triad)
            if ($this->isConfidentialityViolation($message)) {
                $refusal = $this->getConfidentialityRefusalResponse();
                $words = preg_split('/(\s+)/u', $refusal['reply'], -1, PREG_SPLIT_DELIM_CAPTURE);
                foreach ($words as $w) {
                    echo "data: " . json_encode(['token' => $w]) . "\n\n";
                    flush();
                    usleep(6000);
                }
                echo "data: " . json_encode([
                    'done' => true,
                    'reply' => $refusal['reply'],
                    'source' => $refusal['source'],
                    'suggestions' => $refusal['suggestions'],
                    'actionable_task' => null,
                ]) . "\n\n";
                flush();
                return;
            }

            // 2. Gather user context strictly isolated to this user (aggregate queries across full dataset)
            $now = Carbon::now(config('app.timezone', 'Asia/Manila'));
            $totalTasks = $user->tasks()->count();
            $completedTasks = $user->tasks()->whereNotNull('completed_at')->count();
            $pendingTasks = $totalTasks - $completedTasks;

            $overdueCount = $user->tasks()
                ->whereNull('completed_at')
                ->whereNotNull('due_at')
                ->where('due_at', '<', $now)
                ->count();

            $dueTodayCount = $user->tasks()
                ->whereNull('completed_at')
                ->whereNotNull('due_at')
                ->whereDate('due_at', $now->toDateString())
                ->count();

            $highPriorityPending = $user->tasks()
                ->whereNull('completed_at')
                ->where('priority', 'high')
                ->limit(5)
                ->get();

            $recentTasks = $user->tasks()
                ->with('subTasks')
                ->latest('created_at')
                ->take(10)
                ->get();

            $apiKey = config('services.gemini.key');

            // 3. If Gemini API key is configured, stream from Gemini REST SSE endpoint
            if (!empty($apiKey)) {
                try {
                    $streamedSuccessfully = $this->streamGeminiApi($apiKey, $message, $action, [
                        'userName' => $user->name,
                        'totalTasks' => $totalTasks,
                        'completedTasks' => $completedTasks,
                        'pendingTasks' => $pendingTasks,
                        'overdueCount' => $overdueCount,
                        'dueTodayCount' => $dueTodayCount,
                        'highPriorityTasks' => $highPriorityPending->pluck('title')->take(5)->toArray(),
                        'recentTasks' => $recentTasks->map(fn($t) => [
                            'title' => $t->title,
                            'priority' => $t->priority,
                            'completed' => $t->isCompleted(),
                            'due' => $t->due_at,
                        ])->toArray(),
                    ]);

                    if ($streamedSuccessfully) {
                        return;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Gemini streaming call failed, falling back to local stream: ' . $e->getMessage());
                }
            }

            // 4. Built-in Intelligence Engine Streaming Fallback
            $fallback = $this->generateLocalResponse($message, $action, [
                'user' => $user,
                'userTasks' => $recentTasks,
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
                'pendingTasks' => $pendingTasks,
                'overdueCount' => $overdueCount,
                'dueTodayCount' => $dueTodayCount,
                'highPriorityPending' => $highPriorityPending,
            ]);

            $words = preg_split('/(\s+)/u', $fallback['reply'], -1, PREG_SPLIT_DELIM_CAPTURE);
            foreach ($words as $w) {
                echo "data: " . json_encode(['token' => $w]) . "\n\n";
                flush();
                usleep(8000); // 8ms per token for natural, fast streaming
            }

            echo "data: " . json_encode([
                'done' => true,
                'reply' => $fallback['reply'],
                'source' => 'built_in',
                'actionable_task' => $fallback['actionable_task'] ?? null,
                'suggestions' => $fallback['suggestions'] ?? [],
            ]) . "\n\n";
            flush();

        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Handle incoming AI conversation or productivity action (JSON response).
     * CIA: Strictly queries only the authenticated user's tasks.
     * Enforces strict confidentiality boundaries (IAS).
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1500',
            'action' => 'nullable|string|in:chat,breakdown,weekly_summary,prioritize,help',
        ]);

        $user = $request->user();
        $message = trim($validated['message']);
        $action = $validated['action'] ?? 'chat';

        // 1. Confidentiality Guardrail check
        if ($this->isConfidentialityViolation($message)) {
            $refusal = $this->getConfidentialityRefusalResponse();
            return response()->json([
                'success' => true,
                'reply' => $refusal['reply'],
                'source' => $refusal['source'],
                'suggestions' => $refusal['suggestions'],
                'actionable_task' => null,
            ]);
        }

        // Retrieve user's tasks strictly scoped under CIA Triad (aggregate queries across full dataset)
        $now = Carbon::now(config('app.timezone', 'Asia/Manila'));
        $totalTasks = $user->tasks()->count();
        $completedTasks = $user->tasks()->whereNotNull('completed_at')->count();
        $pendingTasks = $totalTasks - $completedTasks;

        $overdueCount = $user->tasks()
            ->whereNull('completed_at')
            ->whereNotNull('due_at')
            ->where('due_at', '<', $now)
            ->count();

        $dueTodayCount = $user->tasks()
            ->whereNull('completed_at')
            ->whereNotNull('due_at')
            ->whereDate('due_at', $now->toDateString())
            ->count();

        $highPriorityPending = $user->tasks()
            ->whereNull('completed_at')
            ->where('priority', 'high')
            ->limit(5)
            ->get();

        $recentTasks = $user->tasks()
            ->with('subTasks')
            ->latest('created_at')
            ->take(10)
            ->get();

        $apiKey = config('services.gemini.key');

        // If Gemini API Key is available, attempt external LLM call
        if (!empty($apiKey)) {
            try {
                $response = $this->callGeminiApi($apiKey, $message, $action, [
                    'userName' => $user->name,
                    'totalTasks' => $totalTasks,
                    'completedTasks' => $completedTasks,
                    'pendingTasks' => $pendingTasks,
                    'overdueCount' => $overdueCount,
                    'dueTodayCount' => $dueTodayCount,
                    'highPriorityTasks' => $highPriorityPending->pluck('title')->take(5)->toArray(),
                    'recentTasks' => $recentTasks->map(fn($t) => [
                        'title' => $t->title,
                        'priority' => $t->priority,
                        'completed' => $t->isCompleted(),
                        'due' => $t->due_at,
                    ])->toArray(),
                ]);

                if ($response['success']) {
                    $actionable = $this->extractActionableTask($message, $response['reply']);
                    if ($actionable === null && ($action === 'breakdown' || str_contains(strtolower($message), 'break down'))) {
                        $actionable = [
                            'title' => $this->cleanGoalTitle($message),
                            'sub_tasks' => [
                                'Define requirements and project scope',
                                'Create initial outline or wireframes',
                                'Execute core implementation tasks',
                                'Review deliverable against criteria',
                                'Finalize and launch',
                            ],
                            'category' => 'Projects',
                            'priority' => 'medium',
                        ];
                    }

                    return response()->json([
                        'success' => true,
                        'reply' => $response['reply'],
                        'source' => 'gemini',
                        'actionable_task' => $actionable,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('Gemini API call failed, falling back to smart local assistant: ' . $e->getMessage());
            }
        }

        // Graceful Fallback: Built-in deterministic intelligence engine
        $fallback = $this->generateLocalResponse($message, $action, [
            'user' => $user,
            'userTasks' => $recentTasks,
            'totalTasks' => $totalTasks,
            'completedTasks' => $completedTasks,
            'pendingTasks' => $pendingTasks,
            'overdueCount' => $overdueCount,
            'dueTodayCount' => $dueTodayCount,
            'highPriorityPending' => $highPriorityPending,
        ]);

        return response()->json([
            'success' => true,
            'reply' => $fallback['reply'],
            'source' => 'built_in',
            'actionable_task' => $fallback['actionable_task'] ?? null,
            'suggestions' => $fallback['suggestions'] ?? [],
        ]);
    }

    /**
     * Directly create a task with subtasks recommended by the AI.
     * CIA: Strictly scoped to the authenticated user.
     */
    public function quickCreate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'nullable|string|max:50',
            'priority' => 'nullable|in:low,medium,high',
            'sub_tasks' => 'nullable|array',
            'sub_tasks.*' => 'required|string|max:255',
        ]);

        $task = $request->user()->tasks()->create([
            'title' => trim($validated['title']),
            'category' => $validated['category'] ?? 'General',
            'priority' => $validated['priority'] ?? 'medium',
        ]);

        if (!empty($validated['sub_tasks'])) {
            foreach ($validated['sub_tasks'] as $step) {
                $cleaned = trim($step);
                if ($cleaned !== '') {
                    $task->subTasks()->create([
                        'title' => $cleaned,
                        'is_completed' => false,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Task '{$task->title}' created with " . count($validated['sub_tasks'] ?? []) . ' sub-task steps!',
            'task' => $task->load('subTasks'),
        ]);
    }

    /**
     * Stream from Google Gemini REST SSE endpoint directly to client.
     */
    private function streamGeminiApi(string $apiKey, string $message, string $action, array $context): bool
    {
        $model = config('services.gemini.model', 'gemini-3.5-flash-lite');
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:streamGenerateContent?alt=sse";

        $recentTasksList = '';
        if (!empty($context['recentTasks'])) {
            foreach ($context['recentTasks'] as $t) {
                $status = $t['completed'] ? '✅' : '⏳';
                $due = $t['due'] ? " (due: {$t['due']})" : '';
                $safeTitle = strip_tags($t['title']);
                $recentTasksList .= "  - {$status} [{$t['priority']}] {$safeTitle}{$due}\n";
            }
        }

        $systemInstructionText = "You are Kora — a friendly, chill, and sharp personal productivity assistant. "
            . "Talk like a real person: casual, warm, and straight to the point. No robotic, corporate, or technical system jargon. "
            . "Use natural conversation — like chatting with a smart, helpful friend who keeps you organized. "
            . "You can use emojis occasionally to stay friendly, and markdown (**bold**, bullet points, numbered lists) when it helps readability.\n\n"
            . "CRITICAL IDENTITY & KNOWLEDGE BOUNDARIES (MUST FOLLOW):\n"
            . "1. YOU ONLY ANSWER TO THIS USER: You are exclusively their personal task manager and productivity assistant. You help them plan their day, prioritize their tasks, break goals into actionable steps (always provide 4-6 numbered checklist items: 1. 2. 3.), and give study/work advice.\n"
            . "2. YOU DO NOT KNOW THE SYSTEM OR WHO MADE IT: You have ZERO knowledge about how this system, platform, or app was built, who created or developed it, its developers, codebase, backend architecture, servers, database, or tech stack. Never use technical metaphors like 'engine room', 'backend', 'servers', or 'code'.\n"
            . "3. IF ASKED ABOUT THE SYSTEM, ITS CREATORS, OR WHY YOU CANNOT ANSWER: Simply explain in a friendly, casual way that you have no knowledge about how the system was built, who created it, or its technical inner workings—you are strictly their personal productivity assistant focused on their daily tasks and to-dos.\n"
            . "4. PRIVACY & ISOLATION: Never discuss or speculate on database schemas, .env files, server keys, passwords, or other accounts. Do not lecture about security frameworks or acronyms; just stay purely focused on helping the user get things done.";

        $safeUserName = strip_tags($context['userName'] ?? 'User');
        $userContextText = "User Name: {$safeUserName}\n"
            . "Total tasks: {$context['totalTasks']}, Completed: {$context['completedTasks']}, Pending: {$context['pendingTasks']}\n"
            . "Overdue: {$context['overdueCount']}, Due today: {$context['dueTodayCount']}\n"
            . "High priority tasks: " . (empty($context['highPriorityTasks']) ? 'None' : implode(', ', array_map('strip_tags', $context['highPriorityTasks']))) . "\n";

        if (!empty($recentTasksList)) {
            $userContextText .= "Recent tasks:\n" . $recentTasksList;
        }

        $payload = json_encode([
            'systemInstruction' => [
                'parts' => [
                    ['text' => $systemInstructionText],
                ],
            ],
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => "[User's Current Tasks & Context]\n" . $userContextText . "\n[User Message]\n" . $message],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.85,
                'maxOutputTokens' => 1024,
            ],
        ]);

        $accumulatedReply = '';
        $buffer = '';

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: text/event-stream',
            'x-goog-api-key: ' . $apiKey,
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $chunk) use (&$accumulatedReply, &$buffer) {
            $buffer .= $chunk;
            $lines = explode("\n", $buffer);
            $buffer = array_pop($lines); // Keep incomplete line in buffer

            foreach ($lines as $line) {
                $line = trim($line);
                if (str_starts_with($line, 'data:')) {
                    $jsonStr = trim(substr($line, 5));
                    if ($jsonStr === '') continue;
                    $data = json_decode($jsonStr, true);
                    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($text !== null && $text !== '') {
                        $accumulatedReply .= $text;
                        echo "data: " . json_encode(['token' => $text]) . "\n\n";
                        flush();
                    }
                }
            }
            return strlen($chunk);
        });

        $success = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($success && $httpCode === 200 && $accumulatedReply !== '') {
            $actionableTask = $this->extractActionableTask($message, $accumulatedReply);
            if ($actionableTask === null && ($action === 'breakdown' || str_contains(strtolower($message), 'break down'))) {
                $actionableTask = [
                    'title' => $this->cleanGoalTitle($message),
                    'sub_tasks' => [
                        'Define requirements and project scope',
                        'Create initial outline or wireframes',
                        'Execute core implementation tasks',
                        'Review deliverable against criteria',
                        'Finalize and launch',
                    ],
                    'category' => 'Projects',
                    'priority' => 'medium',
                ];
            }
            echo "data: " . json_encode([
                'done' => true,
                'reply' => $accumulatedReply,
                'source' => 'gemini',
                'actionable_task' => $actionableTask,
                'suggestions' => ['What should I prioritize?', 'Break down a goal into subtasks', 'Show Taskora guide'],
            ]) . "\n\n";
            flush();
            return true;
        }

        return false;
    }

    /**
     * Dispatch request to Google Gemini REST endpoint.
     */
    private function callGeminiApi(string $apiKey, string $message, string $action, array $context): array
    {
        $model = config('services.gemini.model', 'gemini-3.5-flash-lite');
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $recentTasksList = '';
        if (!empty($context['recentTasks'])) {
            foreach ($context['recentTasks'] as $t) {
                $status = $t['completed'] ? '✅' : '⏳';
                $due = $t['due'] ? " (due: {$t['due']})" : '';
                $safeTitle = strip_tags($t['title']);
                $recentTasksList .= "  - {$status} [{$t['priority']}] {$safeTitle}{$due}\n";
            }
        }

        $systemInstructionText = "You are Kora — a friendly, chill, and sharp personal productivity assistant. "
            . "Talk like a real person: casual, warm, and straight to the point. No robotic, corporate, or technical system jargon. "
            . "Use natural conversation — like chatting with a smart, helpful friend who keeps you organized. "
            . "You can use emojis occasionally to stay friendly, and markdown (**bold**, bullet points, numbered lists) when it helps readability.\n\n"
            . "CRITICAL IDENTITY & KNOWLEDGE BOUNDARIES (MUST FOLLOW):\n"
            . "1. YOU ONLY ANSWER TO THIS USER: You are exclusively their personal task manager and productivity assistant. You help them plan their day, prioritize their tasks, break goals into actionable steps (always provide 4-6 numbered checklist items: 1. 2. 3.), and give study/work advice.\n"
            . "2. YOU DO NOT KNOW THE SYSTEM OR WHO MADE IT: You have ZERO knowledge about how this system, platform, or app was built, who created or developed it, its developers, codebase, backend architecture, servers, database, or tech stack. Never use technical metaphors like 'engine room', 'backend', 'servers', or 'code'.\n"
            . "3. IF ASKED ABOUT THE SYSTEM, ITS CREATORS, OR WHY YOU CANNOT ANSWER: Simply explain in a friendly, casual way that you have no knowledge about how the system was built, who created it, or its technical inner workings—you are strictly their personal productivity assistant focused on their daily tasks and to-dos.\n"
            . "4. PRIVACY & ISOLATION: Never discuss or speculate on database schemas, .env files, server keys, passwords, or other accounts. Do not lecture about security frameworks or acronyms; just stay purely focused on helping the user get things done.";

        $safeUserName = strip_tags($context['userName'] ?? 'User');
        $userContextText = "User Name: {$safeUserName}\n"
            . "Total tasks: {$context['totalTasks']}, Completed: {$context['completedTasks']}, Pending: {$context['pendingTasks']}\n"
            . "Overdue: {$context['overdueCount']}, Due today: {$context['dueTodayCount']}\n"
            . "High priority tasks: " . (empty($context['highPriorityTasks']) ? 'None' : implode(', ', array_map('strip_tags', $context['highPriorityTasks']))) . "\n";

        if (!empty($recentTasksList)) {
            $userContextText .= "Recent tasks:\n" . $recentTasksList;
        }

        $response = Http::timeout(10)->withHeaders([
            'x-goog-api-key' => $apiKey,
        ])->post($endpoint, [
            'systemInstruction' => [
                'parts' => [
                    ['text' => $systemInstructionText],
                ],
            ],
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => "[User's Current Tasks & Context]\n" . $userContextText . "\n[User Message]\n" . $message],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.85,
                'maxOutputTokens' => 1024,
            ],
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if ($reply) {
                return ['success' => true, 'reply' => trim($reply)];
            }
        }

        return ['success' => false, 'reply' => null];
    }

    /**
     * Smart local assistant engine providing contextual advice when offline or without external API keys.
     */
    private function generateLocalResponse(string $message, string $action, array $data): array
    {
        $lower = strtolower($message);
        $pending = $data['pendingTasks'];
        $completed = $data['completedTasks'];
        $total = $data['totalTasks'];
        $high = $data['highPriorityPending'];
        $overdue = $data['overdueCount'];
        $dueToday = $data['dueTodayCount'];

        // 0. Test / Ping
        $trimmedPing = trim($lower, " \t\n\r\0\x0B.!?");
        if (in_array($trimmedPing, ['test', 'testing', 'ping', 'check', 'hello world'])) {
            return [
                'reply' => "All systems operational! 🟢 I am online, responsive, and ready to assist you.\n\nWhat would you like to work on or organize today, {$data['user']->name}?",
                'suggestions' => ['What should I prioritize today?', 'Break down a goal into subtasks', 'Summarize my weekly progress'],
            ];
        }

        // 0.1 Specific: How to Change Password
        if (str_contains($lower, 'change password') || str_contains($lower, 'update password') || str_contains($lower, 'reset password')) {
            $reply = "### 🔑 How to Change Your Password\n\n"
                . "You can update your password anytime in your Account Settings:\n\n"
                . "1. Click **Settings** in the left sidebar (or click your profile menu in the top header).\n"
                . "2. Scroll to the **Update Password** card.\n"
                . "3. Enter your **Current Password** for verification.\n"
                . "4. Enter your **New Password** (minimum 8 characters, combining letters, numbers, and symbols).\n"
                . "5. Confirm the new password and click **Save Changes**.\n\n"
                . "*🔒 Passwords in Taskora are securely hashed for account protection.*";
            return [
                'reply' => $reply,
                'suggestions' => ['Show Taskora feature guide', 'What should I prioritize today?'],
            ];
        }

        // 0.2 Specific: What is Taskora / System Overview
        if (str_contains($lower, 'system about') || str_contains($lower, 'what is taskora') || str_contains($lower, 'what is this app') || str_contains($lower, 'what is this system') || str_contains($lower, 'what is this project') || str_contains($lower, 'about taskora') || str_contains($lower, 'what does this app do') || str_contains($lower, 'tell me about taskora')) {
            $reply = "### 📋 About Taskora\n\n"
                . "**Taskora** is a high-productivity task and sprint management platform engineered to help you organize daily tasks, set priorities, and track weekly goals.\n\n"
                . "**Key Capabilities Available to You:**\n"
                . "- 🎯 **Dashboard & Agenda:** Real-time metrics with SVG progress gauges and today's priority task list.\n"
                . "- 📊 **Dynamic Weekly Focus Tracker:** A Mon–Fri progress bar tracking tasks completed toward your weekly goal.\n"
                . "- 📝 **Sub-Task Checklists:** Break down any deliverable into concrete micro-steps with progress tracking.\n"
                . "- 📎 **File Attachments:** Attach reference files, documents, or screenshots up to 10MB per task.\n"
                . "- 🔍 **Deep Filters & Search:** Filter your tasks by priority (High, Medium, Low), dynamic categories, or live search.\n"
                . "- 🔒 **Private & Secure:** All your tasks, checklists, and attachments are strictly private to your personal account.\n\n"
                . "*What goal or task would you like to organize today?*";
            return [
                'reply' => $reply,
                'suggestions' => ['What should I prioritize today?', 'Break down a goal into subtasks', 'Summarize my weekly progress'],
            ];
        }

        // 0.3 Specific: Who are you / What can you do
        if (str_contains($lower, 'who are you') || str_contains($lower, 'what can you do') || str_contains($lower, 'what do you do') || str_contains($lower, 'introduce yourself') || str_contains($lower, 'your purpose')) {
            $reply = "### 👋 I am Kora\n\n"
                . "I am your personal productivity assistant built directly into Taskora.\n\n"
                . "**Here is how I can help you:**\n"
                . "- 📋 **Goal Breakdown:** Give me any project or goal (e.g. *'Break down launching a mobile app'*), and I will generate a 5-step actionable checklist you can add to your tasks with one click.\n"
                . "- 🎯 **Daily Prioritization:** Ask *'What should I prioritize today?'* and I will analyze your due dates, high-priority tasks, and overdue items to create a focused agenda.\n"
                . "- 📊 **Weekly Progress Summary:** Ask *'Summarize my weekly progress'* for a real-time completion report and recommendations.\n"
                . "- 💡 **Taskora Feature Help:** Ask how to attach files, add sub-tasks, use filters, or update your password.\n\n"
                . "*What goal or task would you like to organize today?*";
            return [
                'reply' => $reply,
                'suggestions' => ['What should I prioritize today?', 'Break down a goal into subtasks', 'Summarize my weekly progress'],
            ];
        }

        // 0.4 Specific: How to Attach Files
        if (str_contains($lower, 'attach') && (str_contains($lower, 'file') || str_contains($lower, 'how') || str_contains($lower, 'upload'))) {
            $reply = "### 📎 How to Attach Files to Tasks\n\n"
                . "You can attach documents, spreadsheets, images, and reference files (up to 10MB) directly to any task:\n\n"
                . "1. Click the **Edit** (pencil icon) button on any task row in your Agenda.\n"
                . "2. In the modal, locate the **Attachments** section.\n"
                . "3. Click **Browse** or drag and drop your file (PDF, Word, Excel, PNG, JPG, ZIP).\n"
                . "4. Click **Save Changes** to upload.\n\n"
                . "*🔒 Files are securely stored on the server and streamed through authentication gates to prevent unauthorized access.*";
            return [
                'reply' => $reply,
                'suggestions' => ['How to add sub-tasks', 'How to change password', 'What should I prioritize?'],
            ];
        }

        // 0.5 Specific: How to Add Sub-Tasks
        if (str_contains($lower, 'subtask') || str_contains($lower, 'sub-task') || str_contains($lower, 'sub task')) {
            $reply = "### ✅ How to Use Sub-Task Checklists\n\n"
                . "Sub-tasks let you break big deliverables into manageable micro-steps:\n\n"
                . "1. In your Agenda, click on any task row to **expand** its sub-task drawer.\n"
                . "2. Click **Add Step**, type the step title, and press **Enter**.\n"
                . "3. Check off steps as you complete them — the task progress bar updates automatically in real-time!\n"
                . "4. You can also generate sub-tasks automatically with me by typing: *'Break down [your goal] into steps'*.\n";
            return [
                'reply' => $reply,
                'suggestions' => ['Break down a project goal', 'What should I prioritize today?'],
            ];
        }

        // 1. "Speak normally" / Tone requests
        if (str_contains($lower, 'speak normal') || str_contains($lower, 'talk normal') || str_contains($lower, 'sound like a robot') || str_contains($lower, 'be human') || str_contains($lower, 'talk normally') || str_contains($lower, 'casual')) {
            return [
                'reply' => "Haha, fair enough! My apologies for sounding so robotic earlier. 😊\n\nLet's keep things casual and direct. I'm right here to help you get things done, brainstorm ideas, prioritize what matters, or break down goals into easy steps.\n\nWhat are you working on right now, {$data['user']->name}?",
                'suggestions' => ['Help me prioritize my day', 'Break down a goal into steps', 'Give me a productivity tip'],
            ];
        }

        // 2. Greetings & Salutations (e.g. "hey", "hi", "hello")
        if (preg_match('/^(hey|hi|hello|yo|sup|good\s*(morning|afternoon|evening)|howdy)\b/i', trim($message))) {
            $greetingReply = "Hey {$data['user']->name}! 👋 Hope you're having a great day.\n\n";
            if ($pending > 0) {
                $greetingReply .= "You've got **{$pending} pending task(s)** in your workspace right now. What would you like to tackle or plan today?";
            } else {
                $greetingReply .= "Your to-do list is completely clear right now! Ready to plan out your next goal or sprint?";
            }
            return [
                'reply' => $greetingReply,
                'suggestions' => ['What should I prioritize today?', 'Break down a goal into subtasks', 'Show my weekly summary'],
            ];
        }

        // 3. How are you / Status inquiry
        if (str_contains($lower, 'how are you') || str_contains($lower, 'how r u') || str_contains($lower, "how's it going") || str_contains($lower, 'whats up') || str_contains($lower, "what's up")) {
            return [
                'reply' => "I'm doing great, thanks for asking! Ready to help you stay sharp and productive.\n\nHow are things going with your tasks today?",
                'suggestions' => ['Help me prioritize my day', 'Break down a project', 'Give me a productivity tip'],
            ];
        }

        // 4. Gratitude / Thanks
        if (preg_match('/\b(thank\s*you|thanks|thx|ty|appreciate\s*it)\b/i', $lower)) {
            return [
                'reply' => "You're very welcome, {$data['user']->name}! 😊 Let me know anytime you want to brainstorm, organize a checklist, or schedule your priorities. You've got this! 💪",
                'suggestions' => ['Break down another goal', 'Summarize my weekly progress'],
            ];
        }

        // 5. Productivity Advice / Overwhelmed / Procrastination / Pomodoro
        if (str_contains($lower, 'overwhelm') || str_contains($lower, 'procrastinat') || str_contains($lower, 'pomodoro') || str_contains($lower, 'cannot focus') || str_contains($lower, "can't focus") || str_contains($lower, 'time management') || str_contains($lower, 'productivity tip') || str_contains($lower, 'burnout') || str_contains($lower, 'stuck')) {
            $reply = "### 💡 High-Impact Productivity Advice\n\n"
                . "When you are feeling stuck or overwhelmed, here are three proven techniques:\n\n"
                . "1. **The 2-Minute Rule:** If any step takes less than 2 minutes, knock it out immediately.\n"
                . "2. **The Pomodoro Sprint:** Set a timer for 25 minutes of single-task focus. Then take a 5-minute break.\n"
                . "3. **Decompose to Micro-Steps:** Big tasks cause friction. Break the first milestone down into 3 tiny, bite-sized actions.\n\n"
                . "*Would you like me to help you break down one of your current tasks into smaller steps?*";
            return [
                'reply' => $reply,
                'suggestions' => ['Break down a task into steps', 'What should I prioritize first?', 'Show my weekly summary'],
            ];
        }

        // 6. Weekly Performance Summary
        if ($action === 'weekly_summary' || str_contains($lower, 'summary') || str_contains($lower, 'performance') || str_contains($lower, 'progress')) {
            $completionRate = $total > 0 ? round(($completed / $total) * 100) : 0;
            $reply = "### 📊 Weekly Performance Summary\n\n"
                . "**Overall Completion Rate:** {$completionRate}%\n"
                . "- **Total Tasks on Record:** {$total}\n"
                . "- **Completed Tasks:** {$completed} ✅\n"
                . "- **Pending Actions:** {$pending} ⏳\n"
                . "- **Due Today:** {$dueToday} 🎯\n"
                . "- **Overdue Tasks:** {$overdue} ⚠️\n\n";

            if ($completionRate >= 70) {
                $reply .= "🌟 **Fantastic momentum!** You have completed over {$completionRate}% of your current workload. Keep this cadence to finish the week strong.";
            } elseif ($overdue > 0) {
                $reply .= "💡 **Recommendation:** You have {$overdue} overdue task(s). Tackle those first before moving to new items to protect your peace of mind!";
            } else {
                $reply .= "💡 **Recommendation:** Break your top pending items into smaller sub-tasks to build steady daily momentum.";
            }

            return [
                'reply' => $reply,
                'suggestions' => ['What should I prioritize?', 'Break down a goal into subtasks', 'How do I attach files?'],
            ];
        }

        // 7. Priority Advisor / Focus Mode
        if ($action === 'prioritize' || str_contains($lower, 'priorit') || str_contains($lower, 'focus') || str_contains($lower, 'what next') || str_contains($lower, 'tackle first')) {
            $reply = "### 🎯 Suggested Priorities for Today\n\n";

            if ($pending === 0) {
                $reply .= "🎉 **You are all caught up!** You have zero pending tasks. Take a moment to celebrate, or add a new goal to kickstart your next sprint.";
                return ['reply' => $reply, 'suggestions' => ['Break down a goal into subtasks', 'Summarize my weekly progress']];
            }

            $reply .= "Based on your current agenda, here is your high-yield focus plan:\n\n";
            $step = 1;

            if ($overdue > 0) {
                $reply .= "**{$step}. Clear Overdue Deadlines ({$overdue} tasks):** Focus on past-due items to restore zero-overdue status.\n";
                $step++;
            }

            if ($high->count() > 0) {
                $topHigh = $high->first()->title;
                $reply .= "**{$step}. High Priority Focus:** `{$topHigh}` — Tackle this key deliverable early when mental energy is highest.\n";
                $step++;
            }

            if ($dueToday > 0) {
                $reply .= "**{$step}. Due Today Items ({$dueToday} tasks):** Complete these before the end of the day.\n";
            } else {
                $reply .= "**{$step}. Steady Execution:** Pick 2 medium-priority tasks and knock out their sub-tasks.\n";
            }

            return [
                'reply' => $reply,
                'suggestions' => ['Summarize my performance', 'Break down a complex task', 'Show system features'],
            ];
        }

        // 8. Goal Breakdown / Generate Checklist
        if ($action === 'breakdown' || str_contains($lower, 'break down') || str_contains($lower, 'checklist') || str_contains($lower, 'subtask') || str_contains($lower, 'decompose') || str_contains($lower, 'goal')) {
            $goalTitle = $this->cleanGoalTitle($message);
            $steps = [
                "Define core objectives and success criteria",
                "Gather necessary assets and reference files",
                "Draft initial execution outline / prototype",
                "Review with stakeholders or verify requirements",
                "Final quality audit and wrap-up deliverable",
            ];

            if (str_contains($lower, 'website') || str_contains($lower, 'web') || str_contains($lower, 'app')) {
                $steps = [
                    "Define wireframes and responsive UI layout",
                    "Configure database schema and API controllers",
                    "Implement frontend views with Tailwind and React",
                    "Run automated test suite and verify cross-browser compatibility",
                    "Deploy to production and configure custom domain",
                ];
            } elseif (str_contains($lower, 'study') || str_contains($lower, 'exam') || str_contains($lower, 'course')) {
                $steps = [
                    "Compile lecture notes and syllabus objectives",
                    "Create summary flashcards for high-yield topics",
                    "Complete 2 sets of practice test questions",
                    "Review weak areas with spaced repetition",
                    "Conduct final mock exam under timed conditions",
                ];
            } elseif (str_contains($lower, 'market') || str_contains($lower, 'launch') || str_contains($lower, 'campaign')) {
                $steps = [
                    "Identify target audience and value proposition",
                    "Design promotional graphics and copy assets",
                    "Set up campaign tracking and conversion metrics",
                    "Launch announcements across primary channels",
                    "Analyze engagement data and follow up with leads",
                ];
            }

            $reply = "### 📋 Action Plan: {$goalTitle}\n\n"
                . "I have broken this goal down into 5 actionable, sequence-oriented checklist steps:\n\n";

            foreach ($steps as $idx => $s) {
                $reply .= ($idx + 1) . ". {$s}\n";
            }

            $reply .= "\n*💡 You can add this directly to your Tasks list with all 5 steps pre-populated using the button below!*";

            return [
                'reply' => $reply,
                'actionable_task' => [
                    'title' => $goalTitle,
                    'sub_tasks' => $steps,
                    'category' => 'Projects',
                    'priority' => 'high',
                ],
                'suggestions' => ['What should I prioritize?', 'Weekly performance summary'],
            ];
        }

        // 9. Help & Support / Platform Features
        if ($action === 'help' || str_contains($lower, 'help') || str_contains($lower, 'how to') || str_contains($lower, 'feature') || str_contains($lower, 'attach') || str_contains($lower, 'security')) {
            $reply = "### 💡 Taskora Help & Feature Guide\n\n"
                . "Welcome to Taskora Help & Support! Here is how to get the most out of your workspace:\n\n"
                . "- **✅ Sub-Task Checklists:** Expand any task row or use the Edit Modal to add sub-tasks with instant completion checkboxes and progress tracking.\n"
                . "- **📎 File Attachments:** Attach documents, spreadsheets, or images (up to 10MB) directly to your tasks with secure streamed downloads.\n"
                . "- **🔍 Deep Filtering & Search:** Filter your agenda by priority (High, Medium, Low), dynamic categories, or live search query.\n"
                . "- **⏰ Due Date Reminders:** Automatically badges tasks as **Overdue** (red) or **Due Today** (amber) to keep deadlines visible.\n"
                . "- **🔒 Account Privacy:** Your data is strictly private and isolated to your personal account. Passwords are encrypted with Bcrypt (12 rounds).\n\n"
                . "*Need to brainstorm or organize a project? Just type what you want to achieve!*";

            return [
                'reply' => $reply,
                'suggestions' => ['Break down a project into steps', 'Suggest my top priorities', 'Show my weekly summary'],
            ];
        }

        // 10. Intelligent Conversational Response (instead of a static menu)
        $cleanGoal = $this->cleanGoalTitle($message);
        return [
            'reply' => "I hear you! I'm here to help you get organized and make progress.\n\n"
                . "Whether you want to break down **\"{$cleanGoal}\"** into a 5-step checklist, figure out what to tackle first today, or get productivity tips, just tell me what you'd like to do!",
            'suggestions' => [
                "Break down {$cleanGoal} into steps",
                'What should I prioritize today?',
                'Summarize my weekly progress',
            ],
        ];
    }

    /**
     * Clean and format user message into a clean goal title.
     */
    private function cleanGoalTitle(string $message): string
    {
        $cleaned = preg_replace('/^(break down|create a checklist for|generate subtasks for|decompose|help me with|plan|goal:?)/i', '', $message);
        $cleaned = trim($cleaned, " \t\n\r\0\x0B?:!.,");
        return $cleaned ? ucfirst($cleaned) : 'New Project Goal';
    }

    /**
     * Inspect LLM response to see if numbered steps can be extracted as an actionable task.
     */
    private function extractActionableTask(string $userPrompt, string $aiReply): ?array
    {
        // Check if reply contains numbered list items: 1. , 1) , **1.** , - 1.
        preg_match_all('/^\s*(?:[\*\-]\s*)?(?:\*\*)?(\d+)[\.\)]\s*(?:\*\*)?\s*(.+)$/m', $aiReply, $matches);
        if (!empty($matches[2]) && count($matches[2]) >= 2) {
            $steps = array_slice(array_map(function ($s) {
                return trim(preg_replace('/^\*\*([^*]+)\*\*:?\s*/', '$1: ', $s));
            }, $matches[2]), 0, 8);

            return [
                'title' => $this->cleanGoalTitle($userPrompt),
                'sub_tasks' => $steps,
                'category' => 'Projects',
                'priority' => 'medium',
            ];
        }

        // Fallback: match bullet points if numbered list was not used
        preg_match_all('/^\s*[\*\-]\s+(.+)$/m', $aiReply, $bulletMatches);
        if (!empty($bulletMatches[1]) && count($bulletMatches[1]) >= 3) {
            $steps = array_slice(array_map('trim', $bulletMatches[1]), 0, 8);
            return [
                'title' => $this->cleanGoalTitle($userPrompt),
                'sub_tasks' => $steps,
                'category' => 'Projects',
                'priority' => 'medium',
            ];
        }

        return null;
    }
}
