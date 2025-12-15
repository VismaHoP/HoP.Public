<#
.SYNOPSIS
Generate a 32-byte random salt and a 32-byte PBKDF2-HMACSHA256 hash for a given password.

.DESCRIPTION
This helper outputs a SQL script with the salt and hash automatically inserted.

.PARAMETER Password
The password to derive the hash from. Required.

.PARAMETER Email
The email address for the admin user. Required.

.PARAMETER Username
The username for the admin user.

.PARAMETER FirstName
The first name for the admin user.

.PARAMETER LastName
The last name for the admin user.

.EXAMPLE
PS> .\CreateInitialSQLScript.ps1 -Username 'admin' -Password 'P@ssw0rd!' -Email 'admin@example.com' -FirstName 'Admin' -LastName 'User'
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,

    [Parameter(Mandatory=$true)]
    [string]$Password,

    [Parameter(Mandatory=$true)]
    [string]$Email,

    [Parameter(Mandatory=$true)]
    [string]$FirstName,

    [Parameter(Mandatory=$true)]
    [string]$LastName
)

# Parameters that match project SaltService
$SaltLength = 32
$HashLength = 32
$Iterations = 10000

# Generate salt
$salt = New-Object byte[] $SaltLength
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($salt)
$rng.Dispose()

# Derive PBKDF2-HMACSHA256 hash
$pwdBytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
$pbk = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($pwdBytes, $salt, $Iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
$hash = $pbk.GetBytes($HashLength)

# Convert to hex
$saltHex = ([BitConverter]::ToString($salt)).Replace('-','')
$hashHex = ([BitConverter]::ToString($hash)).Replace('-','')


Write-Output "Generated Hash (hex): $hashHex"
Write-Output "Generated Salt (hex): $saltHex"
# Generate SQL script
$sqlScript = @"
--
-- Script to insert an initial admin user for signature configuration service to use.
-- Generated on: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Password hashing used - PBKDF2-HMACSHA256, 10_000 iterations, 32-byte key and 32-byte salt.
--
WITH insert_user AS (
  INSERT INTO signing_authorize."Users" ("UserType", "Username", "Password", "Salt",
    "InvalidLoginAttempts", "LockedTill", "LicenseHolderId", "CreatedUtc", "ModifiedUtc")
  VALUES (1,
    '$Username', -- Username
    decode('$hashHex','hex'), -- Password hash
    decode('$saltHex','hex'), -- Salt
    0, NULL, NULL, timezone('utc', now()), NULL)
  RETURNING "Id"
)
INSERT INTO signing_authorize."ConfigurationPersons" ("Email", "FirstName", "LastName",
  "IsAdmin", "CanAuthorizeWithGoogle", "UserId")
SELECT
  '$Email', -- Email
  '$FirstName', -- FirstName
  '$LastName', -- LastName
  true, false, i."Id" as "UserId"
FROM insert_user i;
"@

# Output to file
$sqlScript | Out-File -FilePath "CreateInitialUser.sql" -Encoding UTF8
Write-Output "SQL script written to CreateInitialUser.sql"
