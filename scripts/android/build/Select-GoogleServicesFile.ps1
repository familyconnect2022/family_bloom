# Hop thoai chon file Firebase Android, khong doc/upload noi dung.
param([Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference='Stop'
try {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = 'Chon google-services.json cua Family Bloom (Android)'
  $dialog.Filter = 'Firebase Android JSON (google-services.json)|google-services.json|JSON files (*.json)|*.json'
  $dialog.CheckFileExists = $true
  $dialog.Multiselect = $false
  if($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){exit 2}
  [System.IO.File]::WriteAllText($OutputFile,$dialog.FileName,(New-Object System.Text.UTF8Encoding($false)))
  exit 0
}catch{Write-Host ('[Firebase] Khong mo duoc hop thoai: '+$_.Exception.Message);exit 1}
