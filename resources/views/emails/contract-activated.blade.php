@extends('emails.layout')

@section('content')
    <p>Hello {{ $user->fname }},</p>
    <p>Your contract with the Waste-to-Value Platform is now active.</p>
    <table class="info-table" style="width: 100%; margin-top: 16px;">
        <tr>
            <td>Commodity</td>
            <td>{{ $contract->commodity->title }}</td>
        </tr>
        <tr>
            <td>Payment Terms</td>
            <td>{{ $contract->payment_terms ?? '—' }}</td>
        </tr>
        <tr>
            <td>Signed Date</td>
            <td>{{ $contract->signed_date?->format('d M Y') ?? '—' }}</td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Log in to your dashboard to view your contract details.</p>
@endsection
