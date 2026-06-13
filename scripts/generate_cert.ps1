<#
.SYNOPSIS
    Generates a self-signed code-signing certificate for NoteManagerPy.
    Run this ONCE on your development machine to create signing.pfx.

.DESCRIPTION
    Creates a self-signed Authenticode certificate and exports it as
    a password-protected PFX file.  Use the PFX + password in
    build.py (via SIGNING_PFX / SIGNING_PASSWORD env vars) to sign
    the Windows executable after PyInstaller finishes.

    NOTE:  Self-signed certificates are not trusted by other machines.
    SmartScreen will still warn.  This is purely to change the
    publisher from "Unknown Publisher" to "NoteManagerPy".
#>

$CertName = "NoteManagerPy"
$PfxPath  = Join-Path -Path $PSScriptRoot -ChildPath "..\signing.pfx"

# ---- 1. Generate cert in the current-user personal store ----
Write-Host "Generating self-signed code-signing certificate..." -ForegroundColor Cyan
$cert = New-SelfSignedCertificate `
    -Type Custom `
    -Subject "CN=$CertName" `
    -KeyUsage DigitalSignature `
    -TextExtension "2.5.29.37={text}1.3.6.1.5.5.7.3.3" `
    -CertStoreLocation "Cert:\CurrentUser\My"

if (-not $cert) {
    Write-Host "Failed to create certificate." -ForegroundColor Red
    exit 1
}

Write-Host "  Certificate created." -ForegroundColor Green
Write-Host "  Subject : $($cert.Subject)"
Write-Host "  Thumbprint : $($cert.Thumbprint)"

# ---- 2. Export to PFX (password-protected) ----
$securePwd = Read-Host "Enter a password to protect signing.pfx" -AsSecureString
$confirmPwd = Read-Host "Confirm password" -AsSecureString

# Compare secure strings
$bstr1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
$bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmPwd)
$plain1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr1)
$plain2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)

if ($plain1 -ne $plain2) {
    Write-Host "Passwords do not match. Aborting." -ForegroundColor Red
    exit 1
}

# Export
try {
    Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $securePwd -Force
    Write-Host "Exported to: $PfxPath" -ForegroundColor Green
}
catch {
    Write-Host "Export failed: $_" -ForegroundColor Red
    exit 1
}

# ---- 3. Show next steps ----
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  Set these env vars before building:"
Write-Host "    `$env:SIGNING_PFX = '$PfxPath'"
Write-Host "    `$env:SIGNING_PASSWORD = '<the-password-you-entered>'"
Write-Host "  Then run: python scripts/build.py"
Write-Host ""
Write-Host "The .exe will be signed automatically after PyInstaller finishes."
