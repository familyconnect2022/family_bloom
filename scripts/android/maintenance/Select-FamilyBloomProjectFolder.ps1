# GUI folder picker for an EXISTING Family Bloom source project.
# No files are altered here. The BAT + Node validation enforce identity.
param([Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = 'Select the EXISTING Family Bloom project folder (contains package.json)'
  $dialog.ShowNewFolderButton = $false
  $result = $dialog.ShowDialog()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK -or [string]::IsNullOrWhiteSpace($dialog.SelectedPath)) {
    exit 2
  }
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($OutputFile, $dialog.SelectedPath, $encoding)
  exit 0
} catch {
  Write-Host ('[PICKER] Unable to open dialog: ' + $_.Exception.Message)
  exit 1
}
