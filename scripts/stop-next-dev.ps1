$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and
  $_.CommandLine.Contains($workspace) -and
  (
    $_.CommandLine -match "next(\.cmd)?[`" ]+dev" -or
    $_.CommandLine -match "next[\\/]dist[\\/]bin[\\/]next[`" ]+dev" -or
    $_.CommandLine -match "next[\\/]dist[\\/]server[\\/]lib[\\/]start-server\.js"
  )
}

foreach ($process in $processes) {
  try {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
  } catch {
    Write-Host "Could not stop process $($process.ProcessId): $($_.Exception.Message)"
  }
}

if ($processes.Count -gt 0) {
  Start-Sleep -Seconds 1
}
