<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Weekly Goal Target
    |--------------------------------------------------------------------------
    |
    | Defines the default target number of completed tasks for the Mon-Fri
    | dynamic weekly sprint progress bar on the dashboard.
    |
    */
    'weekly_goal' => (int) env('TASKORA_WEEKLY_GOAL', 25),

    /*
    |--------------------------------------------------------------------------
    | Attachment Constraints
    |--------------------------------------------------------------------------
    |
    | Defines maximum file upload size (in kilobytes) and maximum number of
    | attachments allowed per individual task.
    |
    */
    'max_attachment_size_kb' => (int) env('TASKORA_MAX_ATTACHMENT_SIZE_KB', 10240), // 10MB
    'max_attachments_per_task' => (int) env('TASKORA_MAX_ATTACHMENTS_PER_TASK', 10),
];
