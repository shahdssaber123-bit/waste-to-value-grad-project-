@extends('emails.layout')

@section('content')
    <p>Hello {{ $contactName }},</p>
    <p>Thank you for your interest in the Waste-to-Value Platform.</p>
    <p>Please verify your email address by clicking the button below.</p>
    <a href="{{ $verificationUrl }}" class="btn">Verify Email Address</a>
    <p>If the button does not work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 13px; color: #555;">
        {{ $verificationUrl }}
    </p>
    <p>If you did not submit this application, you can safely ignore this email.</p>
@endsection
