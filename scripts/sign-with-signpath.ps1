#Requires -Version 7.0
# Signs an installer via SignPath's plain REST API directly, bypassing the
# signpath/github-action-submit-signing-request GitHub Actions connector.
#
# Why: that connector also passes a github-token for origin verification,
# which requires a working SignPath<->GitHub trust link beyond just a valid
# API token — and "Could not authorize against SignPath API" kept failing
# in ~8 seconds (nowhere near its 600s retry budget) even after the token,
# organization-id, project-slug, signing-policy-slug, and submitter role
# were all confirmed correct against SignPath's own dashboard. The plain
# REST API only needs the Bearer token, no origin-verification handshake,
# so this tests whether that link is the actual problem.
#
# API contract (https://docs.signpath.io/build-system-integration):
#   POST   /API/v1/{OrganizationId}/SigningRequests/SubmitWithArtifact
#   GET    /API/v1/{OrganizationId}/SigningRequests/{id}
#   GET    /API/v1/{OrganizationId}/SigningRequests/{id}/SignedArtifact
#
# Requires PowerShell 7+ for Invoke-WebRequest's -Form parameter (Windows
# PowerShell 5.1 doesn't have it) — GitHub's windows-latest runners have
# pwsh available; the workflow step calling this must set `shell: pwsh`.
param(
  [Parameter(Mandatory)] [string]$ApiToken,
  [Parameter(Mandatory)] [string]$OrganizationId,
  [Parameter(Mandatory)] [string]$ProjectSlug,
  [Parameter(Mandatory)] [string]$SigningPolicySlug,
  [string]$ArtifactConfigurationSlug = 'default',
  [Parameter(Mandatory)] [string]$UnsignedFilePath,
  [Parameter(Mandatory)] [string]$OutputFilePath,
  [int]$PollIntervalSeconds = 10,
  [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'

$baseUrl = "https://app.signpath.io/API/v1/$OrganizationId"
$headers = @{ Authorization = "Bearer $ApiToken" }

# The artifact-configuration (native/vendor/pengu-loader-adjacent config —
# see the client-theme-injector PR) expects a <zip-file> root, matching
# what actions/upload-artifact would have zipped automatically for the
# connector-based flow. Replicate that by hand here.
$zipPath = Join-Path ([System.IO.Path]::GetTempPath()) "unsigned-$([Guid]::NewGuid()).zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $UnsignedFilePath -DestinationPath $zipPath -Force

Write-Host "Submitting signing request for $UnsignedFilePath..."
$submitResponse = Invoke-WebRequest -Method Post -Uri "$baseUrl/SigningRequests/SubmitWithArtifact" `
  -Headers $headers `
  -Form @{
    projectSlug               = $ProjectSlug
    signingPolicySlug         = $SigningPolicySlug
    artifactConfigurationSlug = $ArtifactConfigurationSlug
    artifact                  = Get-Item $zipPath
  }

if ($submitResponse.StatusCode -ne 201) {
  throw "Signing request submission failed with status $($submitResponse.StatusCode): $($submitResponse.Content)"
}

$location = $submitResponse.Headers.Location
if ($location -is [System.Array]) { $location = $location[0] }
if (-not $location) {
  throw "Signing request returned 201 but no Location header was present."
}
Write-Host "Signing request submitted: $location"

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$status = $null
do {
  Start-Sleep -Seconds $PollIntervalSeconds
  $status = Invoke-RestMethod -Method Get -Uri $location -Headers $headers
  Write-Host "Status: $($status.status) / $($status.workflowStatus)"
  if ((Get-Date) -gt $deadline) {
    throw "Timed out after $TimeoutSeconds seconds waiting for the signing request to complete."
  }
} while (-not $status.isFinalStatus)

if ($status.status -ne 'Completed') {
  throw "Signing request did not complete successfully: status=$($status.status) workflowStatus=$($status.workflowStatus)"
}

Write-Host 'Signing completed, downloading signed artifact...'
$signedZipPath = Join-Path ([System.IO.Path]::GetTempPath()) "signed-$([Guid]::NewGuid()).zip"
Invoke-WebRequest -Method Get -Uri "$location/SignedArtifact" -Headers $headers -OutFile $signedZipPath

$extractDir = Join-Path ([System.IO.Path]::GetTempPath()) "signed-extract-$([Guid]::NewGuid())"
Expand-Archive -Path $signedZipPath -DestinationPath $extractDir -Force

$signedFile = Get-ChildItem -Path $extractDir -Filter (Split-Path -Leaf $UnsignedFilePath) -Recurse | Select-Object -First 1
if (-not $signedFile) {
  throw "Signed artifact zip did not contain the expected file: $(Split-Path -Leaf $UnsignedFilePath)"
}

Copy-Item -Path $signedFile.FullName -Destination $OutputFilePath -Force
Write-Host "Signed installer written to $OutputFilePath"
