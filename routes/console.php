<?php

use App\Jobs\ApplyLatePenalties;
use App\Jobs\CheckInventoryThresholds;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new CheckInventoryThresholds)->hourly();
Schedule::job(new ApplyLatePenalties)->daily();
