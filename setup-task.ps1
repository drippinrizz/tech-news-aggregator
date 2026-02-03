$action = New-ScheduledTaskAction -Execute 'C:\Users\camco\tech-news-aggregator\start-aggregator.bat' -WorkingDirectory 'C:\Users\camco\tech-news-aggregator'
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$settings.ExecutionTimeLimit = 'PT0S'
Register-ScheduledTask -TaskName 'TechNewsAggregator' -Action $action -Trigger $trigger -Settings $settings -Description 'Runs tech news aggregator on login' -Force
Write-Host "Task created successfully!"
