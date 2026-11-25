# Creates the WhatsApp Cloud API message templates in infra/whatsapp/templates.json (ADR 020,
# docs/ops/whatsapp-templates.md). Each template is submitted in Swahili (sw) and English (en).
# Existing name+language pairs are skipped, so it is safe to run again.
#
#   $env:WHATSAPP_TOKEN = '<system-user token>'   # never commit or log it
#   .\infra\ops\whatsapp-templates.ps1 -WabaId <id>                     # PLAN: print what would be submitted
#   .\infra\ops\whatsapp-templates.ps1 -WabaId <id> -Apply              # submit text-only templates
#   .\infra\ops\whatsapp-templates.ps1 -WabaId <id> -Apply -ImageHeader -AppId <app id> -SampleImage .\card.png
#   .\infra\ops\whatsapp-templates.ps1 -WabaId <id> -Status             # show review status
param(
  [string] $WabaId,
  # Lists the WhatsApp Business Accounts the token can manage (to find -WabaId).
  [switch] $ListWabas,
  [string] $Token = $env:WHATSAPP_TOKEN,
  [string] $ApiVersion = $(if ($env:WHATSAPP_API_VERSION) { $env:WHATSAPP_API_VERSION } else { 'v21.0' }),
  [switch] $Apply,
  [switch] $Status,
  # Adds an IMAGE header to templates marked imageHeader (then set WHATSAPP_TEMPLATE_IMAGE_HEADER=1).
  [switch] $ImageHeader,
  [string] $AppId,
  [string] $SampleImage,
  [string[]] $Only
)
$ErrorActionPreference = 'Stop'
if (-not $Token) {
  # Prompt without echoing, so the token never lands in history or logs.
  $secure = Read-Host -AsSecureString 'WHATSAPP_TOKEN (system-user token)'
  $Token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}
if (-not $Token) { throw 'Set $env:WHATSAPP_TOKEN (or pass -Token).' }
$graph = "https://graph.facebook.com/$ApiVersion"
$auth = @{ Authorization = "Bearer $Token" }

function Invoke-Graph($Method, $Url, $Body) {
  $req = @{ Method = $Method; Uri = $Url; Headers = $auth }
  if ($Body) {
    $req.ContentType = 'application/json; charset=utf-8'
    $req.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 10 -Compress))
  }
  try { Invoke-RestMethod @req }
  catch {
    $detail = $_.ErrorDetails.Message
    # Windows PowerShell 5.1 sometimes leaves ErrorDetails empty; read the body from the response.
    if (-not $detail -and $_.Exception.Response) {
      try { $detail = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    }
    if ($detail) { $e = ($detail | ConvertFrom-Json).error; throw "Graph $($e.code)/$($e.error_subcode): $($e.error_user_msg) $($e.message)" }
    throw
  }
}

function Get-Existing {
  $out = @(); $url = "$graph/$WabaId/message_templates?fields=id,name,language,status,category,rejected_reason&limit=100"
  while ($url) { $page = Invoke-Graph GET $url; $out += $page.data; $url = $page.paging.next }
  $out
}

if ($ListWabas) {
  # The token's granular scopes name the WABAs it was granted (not the phone number id).
  $scopes = (Invoke-Graph GET "$graph/debug_token?input_token=$Token").data.granular_scopes
  $ids = @($scopes | Where-Object { $_.scope -eq 'whatsapp_business_management' } | ForEach-Object { $_.target_ids }) | Select-Object -Unique
  if (-not $ids) { Write-Host 'Token has no whatsapp_business_management access to any WABA.'; return }
  foreach ($id in $ids) {
    $w = Invoke-Graph GET "$graph/${id}?fields=id,name"
    $phones = (Invoke-Graph GET "$graph/$id/phone_numbers?fields=id,display_phone_number,verified_name").data
    Write-Host "WABA $($w.id)  $($w.name)"
    foreach ($p in $phones) { Write-Host "  phone id $($p.id)  $($p.display_phone_number)  $($p.verified_name)" }
  }
  return
}
if (-not $WabaId) { throw 'Pass -WabaId (find it with -ListWabas).' }

if ($Status) {
  Get-Existing | Where-Object { $_.name -like 'kadisasa_*' } | Sort-Object name, language |
    Format-Table name, language, category, status, rejected_reason -AutoSize
  return
}

$defs = (Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\whatsapp\templates.json') | ConvertFrom-Json).templates
if ($Only) { $defs = $defs | Where-Object { $Only -contains $_.name } }

$handle = $null
if ($ImageHeader -and $Apply) {
  if (-not $AppId -or -not $SampleImage) { throw '-ImageHeader needs -AppId and -SampleImage (a sample card PNG/JPEG).' }
  # Resumable Upload API: Meta reviews templates with a sample header image, referenced by handle.
  $file = Get-Item $SampleImage
  $type = if ($file.Extension -match '\.jpe?g') { 'image/jpeg' } else { 'image/png' }
  $session = Invoke-Graph POST "$graph/$AppId/uploads?file_name=$($file.Name)&file_length=$($file.Length)&file_type=$type"
  $handle = (Invoke-RestMethod -Method Post -Uri "$graph/$($session.id)" -Body ([IO.File]::ReadAllBytes($file.FullName)) `
      -Headers @{ Authorization = "OAuth $Token"; file_offset = '0' }).h
}

function New-Payload($d, $lang) {
  if ($d.category -eq 'AUTHENTICATION') {
    # No custom button text: Meta rejects it for some languages and localises its own label.
    $components = @(
      @{ type = 'BODY'; add_security_recommendation = $true },
      @{ type = 'FOOTER'; code_expiration_minutes = [int]$d.codeExpirationMinutes },
      @{ type = 'BUTTONS'; buttons = @(@{ type = 'OTP'; otp_type = 'COPY_CODE' }) }
    )
  } else {
    $components = @()
    if ($ImageHeader -and $d.imageHeader) {
      $components += @{ type = 'HEADER'; format = 'IMAGE'; example = @{ header_handle = @($(if ($handle) { $handle } else { '<uploaded sample image>' })) } }
    }
    $components += @{ type = 'BODY'; text = $d.body.$lang; example = @{ body_text = @(, @($d.example)) } }
  }
  @{ name = $d.name; language = $lang; category = $d.category; components = $components }
}

$existing = if ($Apply) { Get-Existing } else { @() }
foreach ($d in $defs) {
  foreach ($lang in 'sw', 'en') {
    $p = New-Payload $d $lang
    $ex = $existing | Where-Object { $_.name -eq $d.name -and $_.language -eq $lang } | Select-Object -First 1
    if ($ex -and $ex.status -eq 'REJECTED') {
      # A rejected template is edited in place: a deleted name is blocked for 30 days.
      try {
        $r = Invoke-Graph POST "$graph/$($ex.id)" @{ category = $p.category; components = $p.components }
        Write-Host "edit   $($d.name) [$lang] (was rejected: $($ex.rejected_reason)) -> success=$($r.success)"
      } catch { Write-Host "FAIL   $($d.name) [$lang] edit: $($_.Exception.Message)" -ForegroundColor Red }
      continue
    }
    if ($ex) { Write-Host "skip   $($d.name) [$lang] ($($ex.status))"; continue }
    if (-not $Apply) { Write-Host "plan   $($d.name) [$lang]`n$($p | ConvertTo-Json -Depth 10)`n"; continue }
    try {
      $r = Invoke-Graph POST "$graph/$WabaId/message_templates" $p
      Write-Host "create $($d.name) [$lang] -> $($r.status) (category $($r.category))"
    } catch { Write-Host "FAIL   $($d.name) [$lang]: $($_.Exception.Message)" -ForegroundColor Red }
  }
}
if ($Apply) {
  Get-Existing | Where-Object { $_.name -like 'kadisasa_*' } | Sort-Object name, language |
    Format-Table name, language, category, status, rejected_reason -AutoSize
  Write-Host "Review takes minutes to a day. Check with -Status, then set the env vars in docs/ops/whatsapp-templates.md."
}
