# Sets reCAPTCHA Enterprise enforcement for Firebase phone sign-in (ADR 060,
# docs/ops/recaptcha-enterprise-phone.md). Signs in to gcloud first when needed.
#
#   .\infra\ops\recaptcha-phone-enforcement.ps1                     # AUDIT (default)
#   .\infra\ops\recaptcha-phone-enforcement.ps1 -State ENFORCE      # only after the Android app is checked
#   .\infra\ops\recaptcha-phone-enforcement.ps1 -State OFF          # roll back to invisible v2
#   .\infra\ops\recaptcha-phone-enforcement.ps1 -ReadOnly           # just show the current setting
param(
  [ValidateSet('OFF', 'AUDIT', 'ENFORCE')] [string] $State = 'AUDIT',
  [string] $Project = 'kadisasa-1adb3',
  [switch] $ReadOnly
)
$ErrorActionPreference = 'Stop'

$gcloud = (Get-Command gcloud -ErrorAction SilentlyContinue).Source
if (-not $gcloud) { $gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" }
if (-not (Test-Path $gcloud)) { throw 'gcloud not found. Install it: winget install Google.CloudSDK' }

if (-not (& $gcloud config get-value account 2>$null)) {
  Write-Host 'Signing in to gcloud (a browser page opens; paste the code back here if asked)...'
  & $gcloud auth login --no-launch-browser
  if (-not (& $gcloud config get-value account 2>$null)) { throw 'gcloud sign-in did not complete.' }
}

$base = "https://identitytoolkit.googleapis.com/admin/v2/projects/$Project/config"
function Get-Headers {
  @{ Authorization = "Bearer $(& $gcloud auth print-access-token)"; 'X-Goog-User-Project' = $Project }
}
function Show-Config($label) {
  $cfg = (Invoke-RestMethod -Headers (Get-Headers) $base).recaptchaConfig
  $phone = if ($cfg.phoneEnforcementState) { $cfg.phoneEnforcementState } else { 'OFF (not set)' }
  Write-Host "$label phoneEnforcementState = $phone; useSmsTollFraudProtection = $([bool]$cfg.useSmsTollFraudProtection)"
}

Show-Config 'Current:'
if ($ReadOnly) { return }

if ($State -ne 'OFF') {
  Write-Host 'Enabling the reCAPTCHA Enterprise API (no-op if already on)...'
  & $gcloud services enable recaptchaenterprise.googleapis.com --project $Project
}

$body = @{ recaptchaConfig = @{ phoneEnforcementState = $State; useSmsTollFraudProtection = ($State -ne 'OFF') } } |
  ConvertTo-Json -Depth 3
$mask = 'recaptchaConfig.phoneEnforcementState,recaptchaConfig.useSmsTollFraudProtection'
Invoke-RestMethod -Method Patch -Headers (Get-Headers) -ContentType 'application/json' -Body $body "${base}?updateMask=$mask" | Out-Null

Show-Config 'Now:'
