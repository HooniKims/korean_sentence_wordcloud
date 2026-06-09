$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nextPath = Join-Path $workspace ".next"

if (Test-Path $nextPath) {
  $resolvedNext = (Resolve-Path $nextPath).Path
  if (-not $resolvedNext.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove outside workspace: $resolvedNext"
  }

  Remove-Item -LiteralPath $resolvedNext -Recurse -Force
}
