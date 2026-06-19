@extends('emails.layout')

@section('content')
    <p>Hello,</p>
    <p>A new application has been submitted and the applicant has verified their email. Please review it in the admin dashboard.</p>
    <table class="info-table" style="width: 100%; margin-top: 16px;">
        <tr>
            <td>Company</td>
            <td>{{ $application->company_name }}</td>
        </tr>
        <tr>
            <td>Contact</td>
            <td>{{ $application->contact_name }}</td>
        </tr>
        <tr>
            <td>Email</td>
            <td>{{ $application->email }}</td>
        </tr>
        <tr>
            <td>Type</td>
            <td>{{ ucfirst($application->role) }}</td>
        </tr>
        <tr>
            <td>Submitted</td>
            <td>{{ $application->created_at->format('d M Y, H:i') }}</td>
        </tr>
    </table>
@endsection
