<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subjectText }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            line-height: 1.6;
        }
        .container {
            max-width: 560px;
            margin: 40px auto;
            background: #FFFFFF;
            border-radius: 12px;
            border: 1px solid #E2E8F0;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
            background: #3525CD;
            padding: 24px 32px;
            color: #FFFFFF;
        }
        .brand {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .content {
            padding: 32px;
        }
        .title {
            font-size: 18px;
            font-weight: 700;
            color: #0F172A;
            margin: 0 0 16px 0;
        }
        .message {
            font-size: 15px;
            color: #475569;
            margin-bottom: 24px;
        }
        .button {
            display: inline-block;
            background-color: #3525CD;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
        }
        .footer {
            padding: 20px 32px;
            background: #F8FAFC;
            border-top: 1px solid #E2E8F0;
            font-size: 12px;
            color: #94A3B8;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">Taskora</div>
        </div>
        <div class="content">
            <h2 class="title">{{ $subjectText }}</h2>
            <p class="message">{{ $messageText }}</p>
            @if(!empty($actionUrl))
                <p>
                    <a href="{{ $actionUrl }}" class="button">{{ $actionText ?? 'View in Taskora' }}</a>
                </p>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Taskora Inc. All rights reserved.<br>
            Secure automated transmission under Information Assurance standards.
        </div>
    </div>
</body>
</html>
