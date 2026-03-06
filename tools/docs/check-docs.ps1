param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
}

$docsRoot = Join-Path $RepoRoot 'docs'
if (-not (Test-Path -LiteralPath $docsRoot)) {
  Write-Error "docs directory not found at $docsRoot"
}

$requiredMetaKeys = @('audience', 'owner', 'last-reviewed', 'script-version', 'status')
$activeDocs = Get-ChildItem -LiteralPath $docsRoot -Recurse -Filter *.md | Where-Object {
  $_.FullName -notmatch [regex]::Escape((Join-Path $docsRoot 'reference\legacy\'))
}

$errors = New-Object System.Collections.Generic.List[string]

function Add-Error([string]$message) {
  $errors.Add($message) | Out-Null
}

function Get-MetadataBlock([string]$raw) {
  $normalized = $raw -replace "`r", ''
  if (-not $normalized.StartsWith("---`n")) {
    return $null
  }
  $parts = $normalized.Split("`n")
  $endIndex = -1
  for ($i = 1; $i -lt $parts.Length; $i++) {
    if ($parts[$i] -eq '---') {
      $endIndex = $i
      break
    }
  }
  if ($endIndex -lt 0) {
    return $null
  }
  return ($parts[1..($endIndex - 1)] -join "`n")
}

foreach ($doc in $activeDocs) {
  $raw = Get-Content -LiteralPath $doc.FullName -Raw -Encoding UTF8
  $meta = Get-MetadataBlock $raw
  $relDoc = $doc.FullName.Replace($RepoRoot + [System.IO.Path]::DirectorySeparatorChar, '')

  if ($null -eq $meta) {
    Add-Error("Missing metadata header: $relDoc")
  } else {
    foreach ($key in $requiredMetaKeys) {
      if ($meta -notmatch "(?m)^\s*$([regex]::Escape($key))\s*:\s*.+$") {
        Add-Error("Missing metadata key '$key': $relDoc")
      }
    }
  }

  $linkMatches = [regex]::Matches($raw, '\[[^\]]+\]\(([^)]+)\)')
  foreach ($m in $linkMatches) {
    $target = $m.Groups[1].Value.Trim()
    if ([string]::IsNullOrWhiteSpace($target)) { continue }
    if ($target -match '^(https?://|mailto:|#)') { continue }

    $targetPath = $target.Split('#')[0].Split('?')[0]
    if ([string]::IsNullOrWhiteSpace($targetPath)) { continue }

    $resolved = [System.IO.Path]::GetFullPath((Join-Path $doc.DirectoryName $targetPath))
    if (-not (Test-Path -LiteralPath $resolved)) {
      Add-Error("Broken link in $relDoc -> $target")
    }
  }
}

$stalePatterns = @(
  @{ regex = '\bRefresh Checklist\b'; label = 'Stale menu phrase: Refresh Checklist' },
  @{ regex = '\bscoped to one store\b'; label = 'Stale single-store claim: scoped to one store' },
  @{ regex = '\bsingle-store\b'; label = 'Stale single-store claim: single-store' },
  @{ regex = 'one store \(State of Mind\)'; label = 'Stale single-store claim: one store (State of Mind)' }
)

foreach ($doc in $activeDocs) {
  $relDoc = $doc.FullName.Replace($RepoRoot + [System.IO.Path]::DirectorySeparatorChar, '')
  $raw = Get-Content -LiteralPath $doc.FullName -Raw -Encoding UTF8
  foreach ($p in $stalePatterns) {
    if ($raw -match $p.regex) {
      Add-Error("$($p.label) in $relDoc")
    }
  }
}

$aliasMap = @{
  'docs\QUICK_START.md' = 'docs/users/quick-start.md'
  'docs\USER_MANUAL.md' = 'docs/users/user-manual.md'
  'docs\VAULT_QUICK_REFERENCE_CARD.md' = 'docs/users/quick-reference-card.md'
  'docs\apps_script_deployment_guide.md' = 'docs/admins/deployment-guide.md'
  'docs\STOCKING_RULES_TEST_GUIDE.md' = 'docs/developers/stocking-rules-test-guide.md'
  'docs\future_features_backlog.md' = 'docs/product/future-features-backlog.md'
  'docs\CHANGELOG.md' = 'docs/changelog.md'
  'docs\reference\README.md' = 'docs/reference/index.md'
}

foreach ($oldPath in $aliasMap.Keys) {
  $oldAbs = Join-Path $RepoRoot $oldPath
  $newRel = $aliasMap[$oldPath]
  $newAbs = Join-Path $RepoRoot $newRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar)

  if (-not (Test-Path -LiteralPath $oldAbs)) {
    Add-Error("Missing alias file: $oldPath")
    continue
  }
  if (-not (Test-Path -LiteralPath $newAbs)) {
    Add-Error("Alias target missing for $oldPath -> $newRel")
    continue
  }
  $oldRaw = Get-Content -LiteralPath $oldAbs -Raw -Encoding UTF8
  $linkMatches = [regex]::Matches($oldRaw, '\[[^\]]+\]\(([^)]+)\)')
  $pointsToTarget = $false
  foreach ($m in $linkMatches) {
    $target = $m.Groups[1].Value.Trim()
    if ([string]::IsNullOrWhiteSpace($target)) { continue }
    if ($target -match '^(https?://|mailto:|#)') { continue }
    $targetPath = $target.Split('#')[0].Split('?')[0]
    if ([string]::IsNullOrWhiteSpace($targetPath)) { continue }

    $resolved = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $oldAbs) $targetPath))
    if ($resolved -eq [System.IO.Path]::GetFullPath($newAbs)) {
      $pointsToTarget = $true
      break
    }
  }
  if (-not $pointsToTarget) {
    Add-Error("Alias file does not point to target: $oldPath -> $newRel")
  }
}

if ($errors.Count -gt 0) {
  Write-Host "DOC CHECK FAILED ($($errors.Count) issue(s))" -ForegroundColor Red
  foreach ($e in $errors) { Write-Host " - $e" -ForegroundColor Red }
  exit 1
}

Write-Host "DOC CHECK PASSED" -ForegroundColor Green
Write-Host ("Checked active docs: {0}" -f $activeDocs.Count)
exit 0
