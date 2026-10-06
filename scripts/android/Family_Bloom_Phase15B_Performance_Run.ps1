param(
  [int]$TimeoutMinutes = 10,
  [int]$SampleSeconds = 2,
  [string]$Serial = ""
)

$ErrorActionPreference = "Stop"
$Package = "com.familybloom.android"
$DeepLink = "familybloom://performance-test?autoStart=1"
$ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportDir = Join-Path $ProjectRoot "reports\device\phase15b-$Timestamp"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Fail([string]$Message) {
  Write-Host "[ERROR] $Message" -ForegroundColor Red
  exit 1
}

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCmd) {
  $candidate = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
  if (Test-Path $candidate) { $adb = $candidate } else { Fail "adb was not found. Open Android Studio once or add platform-tools to PATH." }
} else {
  $adb = $adbCmd.Source
}

& $adb start-server | Out-Null
if (-not $Serial) {
  $devices = @(& $adb devices | Select-Object -Skip 1 | ForEach-Object {
    if ($_ -match '^([^\s]+)\s+device$') { $Matches[1] }
  })
  if ($devices.Count -eq 0) { Fail "No authorized Android device was found." }
  if ($devices.Count -gt 1) {
    Write-Host "Connected devices:" -ForegroundColor Yellow
    $devices | ForEach-Object { Write-Host "  $_" }
    Fail "More than one device is connected. Re-run with -Serial <device-serial>."
  }
  $Serial = $devices[0]
}

$state = (& $adb -s $Serial get-state 2>$null | Out-String).Trim()
if ($state -ne "device") { Fail "Device $Serial is not available." }
$installed = (& $adb -s $Serial shell pm path $Package 2>$null | Out-String).Trim()
if (-not $installed) { Fail "Family Bloom debug build ($Package) is not installed on $Serial." }

Write-Host "" 
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  FAMILY BLOOM - PHASE 15B APP-WIDE PERFORMANCE RUN" -ForegroundColor Magenta
Write-Host "  Device : $Serial"
Write-Host "  Output : $ReportDir"
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "Bloom will navigate automatically. Do not touch the phone until it returns to the Performance Lab." -ForegroundColor Yellow
Write-Host "The debug build must be able to reach Metro if this is a development APK." -ForegroundColor Yellow

# Keep the log small, reset Android frame statistics, and cold-start the process
# so am start -W gives a useful native launch reference for this run.
& $adb -s $Serial logcat -c | Out-Null
& $adb -s $Serial shell dumpsys gfxinfo $Package reset 2>$null | Out-Null
& $adb -s $Serial shell am force-stop $Package | Out-Null
Start-Sleep -Milliseconds 700

# Open the internal Performance Lab and auto-start the app-wide run.
$launch = & $adb -s $Serial shell am start -W -a android.intent.action.VIEW -d $DeepLink $Package 2>&1
$launchText = ($launch | Out-String)
$launchText | Set-Content -Encoding UTF8 (Join-Path $ReportDir "launch.txt")
$nativeLaunchMs = 0
if ($launchText -match 'TotalTime:\s*(\d+)') { $nativeLaunchMs = [int]$Matches[1] }

function Get-PssKb {
  $text = (& $adb -s $Serial shell dumpsys meminfo $Package 2>$null | Out-String)
  if ($text -match 'TOTAL PSS:\s*([0-9,]+)') { return [int](($Matches[1] -replace ',', '')) }
  $line = ($text -split "`r?`n" | Where-Object { $_ -match '^\s*TOTAL\s+[0-9,]+' } | Select-Object -First 1)
  if ($line -and $line -match '^\s*TOTAL\s+([0-9,]+)') { return [int](($Matches[1] -replace ',', '')) }
  return 0
}

$started = Get-Date
$deadline = $started.AddMinutes($TimeoutMinutes)
$samples = New-Object System.Collections.Generic.List[object]
$finalStatus = "TIMEOUT"
$overall = "N/A"
$lastProgress = ""

while ((Get-Date) -lt $deadline) {
  $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
  $pssKb = Get-PssKb
  $samples.Add([pscustomobject]@{
    elapsed_sec = $elapsed
    pss_kb = $pssKb
    pss_mb = [math]::Round($pssKb / 1024, 1)
  })

  $rnLog = (& $adb -s $Serial logcat -d -v brief 'ReactNativeJS:I' '*:S' 2>$null | Out-String)
  $progressLines = @($rnLog -split "`r?`n" | Where-Object { $_ -match '\[FB_PERF_SWEEP\]' })
  if ($progressLines.Count -gt 0) {
    $latest = $progressLines[-1]
    if ($latest -ne $lastProgress) {
      Write-Host $latest
      $lastProgress = $latest
    }
  }
  if ($rnLog -match '\[FB_PERF_SWEEP\] COMPLETE[^\r\n]*overall=([A-Z]+)') {
    $finalStatus = "COMPLETE"
    $overall = $Matches[1]
    break
  }
  if ($rnLog -match '\[FB_PERF_SWEEP\] ABORT') {
    $finalStatus = "ABORTED"
    break
  }
  Start-Sleep -Seconds ([math]::Max(1, $SampleSeconds))
}

$allLog = (& $adb -s $Serial logcat -d -v threadtime 2>$null | Out-String)
$allLog | Set-Content -Encoding UTF8 (Join-Path $ReportDir "logcat.txt")
($allLog -split "`r?`n" | Where-Object { $_ -match '\[FB_PERF_SWEEP\]' }) | Set-Content -Encoding UTF8 (Join-Path $ReportDir "phase15b-markers.txt")
& $adb -s $Serial shell dumpsys meminfo $Package 2>$null | Set-Content -Encoding UTF8 (Join-Path $ReportDir "meminfo-final.txt")
& $adb -s $Serial shell dumpsys gfxinfo $Package framestats 2>$null | Set-Content -Encoding UTF8 (Join-Path $ReportDir "gfxinfo-framestats.txt")
$samples | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $ReportDir "phase15b-native-memory.csv")

$valid = @($samples | Where-Object { $_.pss_kb -gt 0 })
$maxPss = if ($valid.Count) { [math]::Round((($valid | Measure-Object pss_mb -Maximum).Maximum), 1) } else { 0 }
$avgPss = if ($valid.Count) { [math]::Round((($valid | Measure-Object pss_mb -Average).Average), 1) } else { 0 }
$endPss = if ($valid.Count) { $valid[-1].pss_mb } else { 0 }
$durationSec = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)

$summary = @(
  "FAMILY BLOOM · PHASE 15B NATIVE ANDROID PERFORMANCE",
  "Generated: $((Get-Date).ToString('o'))",
  "Device: $Serial",
  "Package: $Package",
  "Status: $finalStatus",
  "App verdict: $overall",
  "Duration: $durationSec sec",
  "Android am start TotalTime: $nativeLaunchMs ms",
  "PSS samples: $($valid.Count)",
  "Average PSS: $avgPss MB",
  "Peak PSS: $maxPss MB",
  "End PSS: $endPss MB",
  "",
  "Files:",
  "- phase15b-native-memory.csv",
  "- phase15b-markers.txt",
  "- gfxinfo-framestats.txt",
  "- meminfo-final.txt",
  "- logcat.txt"
)
$summary | Set-Content -Encoding UTF8 (Join-Path $ReportDir "PHASE_15B_NATIVE_SUMMARY.txt")

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Phase 15B finished: $finalStatus / $overall" -ForegroundColor Green
Write-Host "  Native PSS avg: $avgPss MB · peak: $maxPss MB · end: $endPss MB"
Write-Host "  Reports: $ReportDir"
Write-Host "============================================================" -ForegroundColor Green

if ($finalStatus -eq "TIMEOUT") { exit 2 }
if ($finalStatus -eq "ABORTED") { exit 3 }
exit 0
