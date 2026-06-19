@extends('emails.layout')

@section('content')
    <p>Hello {{ $user->fname }},</p>
    <p>Your account on the Waste-to-Value Platform has been activated. Use the credentials below to log in.</p>
    <table class="info-table" style="width: 100%; margin-top: 16px;">
        <tr>
            <td>Email</td>
            <td>{{ $user->email }}</td>
        </tr>
        <tr>
            <td>Password</td>
            <td>{{ $plainPassword }}</td>
        </tr>
        <tr>
            <td>Role</td>
            <td>{{ ucfirst(str_replace('_', ' ', $user->role)) }}</td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Please change your password after your first login.</p>
@endsection
