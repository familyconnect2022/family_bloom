#Requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ProjectRoot,
  [switch]$ResetSigning
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$logPath = Join-Path $ProjectRoot 'release\BUILD_RESULT.txt'

function Ensure-Success([string]$Task) {
  if ($LASTEXITCODE -ne 0) { throw "$Task failed (exit $LASTEXITCODE)" }
}
function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Missing required program: $Name" }
}
function ConvertTo-Plain([Security.SecureString]$Secure) {
  if ($null -eq $Secure) { throw 'Signing password is missing' }
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
function Prompt-Secret([string]$Message) {
  $result = Read-Host $Message -AsSecureString
  if ($result.Length -eq 0) { throw 'Empty password is not accepted' }
  return $result
}
function Log([string]$Message) {
  Write-Host $Message
  Add-Content -LiteralPath $logPath -Value $Message -Encoding UTF8
}
function Find-ApkSigner([string]$SdkRoot) {
  $root = Join-Path $SdkRoot 'build-tools'
  if (-not (Test-Path -LiteralPath $root)) { throw 'Android SDK build-tools not installed' }
  foreach ($folder in (Get-ChildItem -LiteralPath $root -Directory | Sort-Object Name -Descending)) {
    $candidate = Join-Path $folder.FullName 'apksigner.bat'
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw 'apksigner.bat not found under Android SDK build-tools'
}

New-Item -Path (Join-Path $ProjectRoot 'release') -ItemType Directory -Force | Out-Null
Set-Content -LiteralPath $logPath -Encoding UTF8 -Value 'Family Bloom signed Android Release build report'
$success = $false
try {
  if ($env:OS -ne 'Windows_NT') { throw 'This signing script requires Windows and PowerShell with DPAPI support.' }
  Set-Location -LiteralPath $ProjectRoot
  Require-Command 'node'
  Require-Command 'npm.cmd'
  & node scripts/android/prepare-android-local.cjs
  Ensure-Success 'Android source, Session Gateway and dependency preflight'
  foreach ($required in @('package.json','app.json','app.config.js','eas.json')) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Missing $required" }
  }

  if (-not (Test-Path -LiteralPath 'google-services.json' -PathType Leaf)) {
    $gsPath = $env:FB_GOOGLE_SERVICES_JSON
    if ([string]::IsNullOrWhiteSpace($gsPath)) { $gsPath = Read-Host 'Firebase google-services.json is missing. Enter full path to your existing file' }
    if ([string]::IsNullOrWhiteSpace($gsPath) -or -not (Test-Path -LiteralPath $gsPath -PathType Leaf)) {
      throw 'google-services.json is required by app.config.js. No APK built.'
    }
    Copy-Item -LiteralPath $gsPath -Destination (Join-Path $ProjectRoot 'google-services.json')
    Log '[CONFIG] Copied google-services.json from local user supplied path.'
  }
  & node scripts/android/build/firebase-android-config.cjs check $ProjectRoot
  Ensure-Success 'Firebase Android config check'

  # Store only DPAPI encrypted SecureString objects in user's Windows profile.
  $configDir = Join-Path $env:APPDATA 'FamilyBloom'
  $configFile = Join-Path $configDir 'release-signing.dpapi.xml'
  if ($ResetSigning -and (Test-Path -LiteralPath $configFile)) { Remove-Item -LiteralPath $configFile -Force }
  $signing = $null
  if (Test-Path -LiteralPath $configFile) {
    $signing = Import-Clixml -LiteralPath $configFile
    if ($signing.StorePassword -isnot [Security.SecureString] -or $signing.KeyPassword -isnot [Security.SecureString]) {
      throw 'Cached signing credentials invalid. Re-run BAT with -ResetSigning.'
    }
    Log '[SIGN] Using saved Windows DPAPI encrypted keystore settings.'
  } else {
    $defaultKeystore = 'D:\FB\Keys\familybloom-release.jks'
    $entered = Read-Host "Keystore path (Enter = $defaultKeystore)"
    $keystorePath = if ([string]::IsNullOrWhiteSpace($entered)) { $defaultKeystore } else { $entered.Trim('"') }
    if (-not (Test-Path -LiteralPath $keystorePath -PathType Leaf)) { throw "Keystore file not found: $keystorePath" }
    $enteredAlias = Read-Host 'Key alias (Enter = familybloom_release)'
    $keyAlias = if ([string]::IsNullOrWhiteSpace($enteredAlias)) { 'familybloom_release' } else { $enteredAlias.Trim() }
    $storePassword = Prompt-Secret 'Enter keystore password'
    $keyPassword = Prompt-Secret 'Enter key password (can be identical to keystore password)'
    $signing = [pscustomobject]@{
      KeystorePath  = (Resolve-Path -LiteralPath $keystorePath).Path
      Alias         = $keyAlias
      StorePassword = $storePassword
      KeyPassword   = $keyPassword
    }
    New-Item -Path $configDir -ItemType Directory -Force | Out-Null
    $signing | Export-Clixml -LiteralPath $configFile -Force
    Log '[SIGN] Saved keystore settings with Windows user DPAPI. No plaintext password file created.'
  }
  if (-not (Test-Path -LiteralPath $signing.KeystorePath -PathType Leaf)) { throw "Keystore not found: $($signing.KeystorePath)" }
  if ([string]::IsNullOrWhiteSpace($signing.Alias)) { throw 'Signing key alias missing' }


  $sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
  if (-not (Test-Path -LiteralPath $sdk -PathType Container)) { throw "Android SDK not found: $sdk" }
  $env:ANDROID_HOME = $sdk
  $env:ANDROID_SDK_ROOT = $sdk
  if (-not $env:JAVA_HOME) {
    $jbr = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
    if (Test-Path -LiteralPath (Join-Path $jbr 'bin\java.exe')) { $env:JAVA_HOME = $jbr }
  }
  if ($env:JAVA_HOME) { $env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH }
  Require-Command 'java'
  $apkSigner = Find-ApkSigner $sdk
  Log '[GATE] Checking Android source and route/build entrypoints.'
  & npm.cmd run route:check
  Ensure-Success 'route:check'
  & npm.cmd run login:pill-edges-check
  Ensure-Success 'login:pill-edges-check'
  & npm.cmd run single-session:config-check
  Ensure-Success 'single-session:config-check'
  & npm.cmd run single-session:check
  Ensure-Success 'single-session:check'
  & npm.cmd run build:entrypoints-check
  Ensure-Success 'build:entrypoints-check'
  & npm.cmd run source:imports-check
  Ensure-Success 'source:imports-check'
  & npm.cmd run graph:web-parity:check
  Ensure-Success 'Android Web genealogy parity'
  & npm.cmd run graph:web-dashboard:check
  Ensure-Success 'Android Web dashboard parity'
  & npm.cmd run graph:relation-choice:check
  Ensure-Success 'Relationship selection policy (1 partner / 2 parents / many children)'
  & npm.cmd run graph:postsave:check
  Ensure-Success 'Graph post-save full tree navigation and double-submit guard'
  & npm.cmd run android:separation:check
  Ensure-Success 'android:separation:check'
  & npm.cmd run typecheck
  Ensure-Success 'Android typecheck'
  & npm.cmd run release:check
  Ensure-Success 'Android release:check'

  Log '[PREBUILD] Clean Expo Android native regeneration (no npm install).'
  & npx.cmd --no-install expo prebuild --platform android --clean --no-install
  Ensure-Success 'Expo prebuild'
  $gradleFile = Join-Path $ProjectRoot 'android\app\build.gradle'
  if (-not (Test-Path -LiteralPath $gradleFile -PathType Leaf)) { throw 'Prebuild did not generate android/app/build.gradle' }
  if (-not (Test-Path -LiteralPath 'android\gradlew.bat' -PathType Leaf)) { throw 'Prebuild did not generate android/gradlew.bat' }
  & node scripts/setup/check-generated-android-package.js 'com.familybloom.android'
  Ensure-Success 'Android native package check'
  & node scripts/setup/check-p2_37r2c-native-package.js --require-node-module --require-resolve --require-effective-config --require-generated-project --require-gradle-project
  Ensure-Success 'Android native module and Gradle graph proof'


  # Append Groovy DSL after all generated build.gradle blocks; override Expo's default debug release signing.
  $gradleSigningPatch = @'

// Family Bloom R17R1: native release signing reads runtime environment only.
// No signing passwords or private paths are embedded into the project.
android {
    signingConfigs {
        familyBloomRelease {
            storeFile file(System.getenv('FB_KEYSTORE_FILE'))
            storePassword System.getenv('FB_KEYSTORE_PASSWORD')
            keyAlias System.getenv('FB_KEY_ALIAS')
            keyPassword System.getenv('FB_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.familyBloomRelease
        }
    }
}
'@
  Add-Content -LiteralPath $gradleFile -Value $gradleSigningPatch -Encoding UTF8
  Log '[SIGN] Added release signing config with environment references only.'

  $env:FB_KEYSTORE_FILE = $signing.KeystorePath
  $env:FB_KEY_ALIAS = [string]$signing.Alias
  $env:FB_KEYSTORE_PASSWORD = ConvertTo-Plain $signing.StorePassword
  $env:FB_KEY_PASSWORD = ConvertTo-Plain $signing.KeyPassword

  Log '[GRADLE] Building :app:assembleRelease. Gradle may take time.'
  Push-Location -LiteralPath (Join-Path $ProjectRoot 'android')
  try {
    & .\gradlew.bat --no-daemon :app:assembleRelease
    Ensure-Success 'Gradle release assembly'
  } finally { Pop-Location }

  $apkRoot = Join-Path $ProjectRoot 'android\app\build\outputs\apk\release'
  $apk = Get-ChildItem -LiteralPath $apkRoot -File -Filter '*.apk' -ErrorAction Stop |
      Where-Object { $_.Name -notmatch 'unsigned' } | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  if (-not $apk) { throw 'No signed release APK produced. Unsigned APK is not accepted.' }

  & node scripts/setup/check-p2_37r2c-apk-native-proof.js $apk.FullName
  Ensure-Success 'Android APK native identity proof'
  & node scripts/setup/check-board-audio-apk.js $apk.FullName
  Ensure-Success 'Android compiled board audio proof'
  Log '[SIGN] Verifying APK cryptographic signature using Android SDK apksigner.'
  & $apkSigner verify --verbose --print-certs $apk.FullName
  Ensure-Success 'apksigner verify'
  $app = Get-Content -LiteralPath 'app.json' -Raw -Encoding UTF8 | ConvertFrom-Json
  $version = [string]$app.expo.version
  $versionCode = [string]$app.expo.android.versionCode
  if (-not $version -or -not $versionCode) { throw 'app.json missing version/versionCode' }
  $dest = Join-Path (Join-Path $ProjectRoot 'release') ("FamilyBloom_{0}_{1}_Release_Signed.apk" -f $version, $versionCode)
  Copy-Item -LiteralPath $apk.FullName -Destination $dest -Force
  $digest = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
  Log ('[PASS] Signed APK: ' + $dest)
  Log ('[PASS] APK SHA256: ' + $digest)
  Log '[NOTE] Device installation and runtime Firebase/media tests are separate gates.'
  $success = $true
}
catch {
  Log ('[FAIL] ' + $_.Exception.Message)
  Write-Host ('Build report: ' + $logPath)
}
finally {
  foreach ($name in @('FB_KEYSTORE_FILE','FB_KEYSTORE_PASSWORD','FB_KEY_ALIAS','FB_KEY_PASSWORD')) {
    Remove-Item -Path ('Env:' + $name) -ErrorAction SilentlyContinue
  }
}
if (-not $success) { exit 1 }
exit 0
