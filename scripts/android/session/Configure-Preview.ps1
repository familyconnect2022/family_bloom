#Requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ProjectRoot)
$ErrorActionPreference='Stop'
$ProjectRoot=(Resolve-Path -LiteralPath $ProjectRoot).Path
$envFile=Join-Path $ProjectRoot '.env'
Write-Host 'Family Bloom Android - One-device Preview test account only'
Write-Host 'Gateway must already be deployed as Vercel Preview with SESSION_ANDROID_NATIVE_PREVIEW=1.'
$url=Read-Host 'Session Gateway Preview HTTPS URL ending /api/session'
$uid=Read-Host 'Firebase test UID (same as SESSION_TEST_UIDS on Gateway)'
$parsed=$null
try {$parsed=[uri]$url} catch {throw 'Invalid URL'}
if(-not $parsed -or $parsed.Scheme -ne 'https' -or -not $parsed.AbsolutePath.EndsWith('/api/session') -or $parsed.UserInfo -or $parsed.Fragment -or -not $uid.Trim()) {throw 'Invalid HTTPS endpoint or missing UID'}
$keys=@{
 EXPO_PUBLIC_SINGLE_SESSION_ANDROID_PREVIEW='1'
 EXPO_PUBLIC_SINGLE_SESSION_API_URL=$url.Trim()
 EXPO_PUBLIC_SINGLE_SESSION_TEST_UIDS=$uid.Trim()
}
$lines=if(Test-Path -LiteralPath $envFile){@(Get-Content -LiteralPath $envFile -Encoding UTF8)}else{@()}
$filtered=@($lines | Where-Object {$line=$_; -not ($keys.Keys | Where-Object {$line -match ('^\s*'+[regex]::Escape($_)+'\s*=')} )})
foreach($k in @('EXPO_PUBLIC_SINGLE_SESSION_ANDROID_PREVIEW','EXPO_PUBLIC_SINGLE_SESSION_API_URL','EXPO_PUBLIC_SINGLE_SESSION_TEST_UIDS')){$filtered+=($k+'='+$keys[$k])}
[System.IO.File]::WriteAllLines($envFile,[string[]]$filtered,(New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Saved local public Preview values to .env. No private keys or passwords stored.'
Write-Host 'Rebuild signed APK after configuring. The existing production install is unaffected until the new APK is installed.'
