<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .wrapper {
            background-color: #f4f4f4;
            padding: 40px 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 6px;
            padding: 32px 40px;
        }
        .btn {
            display: inline-block;
            padding: 12px 28px;
            background-color: #1a7a4a;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-size: 15px;
            margin: 20px 0;
        }
        .info-table td {
            padding: 6px 0;
        }
        .info-table td:first-child {
            color: #888888;
            padding-right: 16px;
            white-space: nowrap;
        }
        .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #eeeeee;
            font-size: 12px;
            color: #aaaaaa;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            @yield('content')
            <div class="footer">
                This email was sent by Waste-to-Value Platform. Please do not reply.
            </div>
        </div>
    </div>
</body>
</html>
