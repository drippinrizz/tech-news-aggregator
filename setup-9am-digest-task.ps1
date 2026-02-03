# Setup Windows Scheduled Task for 9 AM Daily Digest
# This task will wake the computer from sleep to send the digest

$taskName = "TechNewsDigest9AM"
$description = "Sends tech news digest at 9 AM daily - wakes PC from sleep"

# Action: Run the digest batch file
$action = New-ScheduledTaskAction `
    -Execute "C:\Users\camco\tech-news-aggregator\run-digest.bat" `
    -WorkingDirectory "C:\Users\camco\tech-news-aggregator"

# Trigger: 9 AM every day
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM

# Settings: Wake from sleep, run if missed, allow on battery
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -WakeToRun

# No execution time limit
$settings.ExecutionTimeLimit = "PT0S"

# Register the task (Force overwrites if exists)
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description $description `
    -Force

Write-Host ""
Write-Host "Task '$taskName' created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Settings:" -ForegroundColor Cyan
Write-Host "  - Runs at: 9:00 AM daily"
Write-Host "  - Wakes PC from sleep: Yes"
Write-Host "  - Runs missed task on wake: Yes"
Write-Host "  - Works on battery: Yes"
Write-Host ""
Write-Host "To verify, run: Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"
