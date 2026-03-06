param(
  [string]$RepoRoot = "",
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$GivenRoot)
  if (-not [string]::IsNullOrWhiteSpace($GivenRoot)) {
    return [System.IO.Path]::GetFullPath($GivenRoot)
  }
  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
}

function Normalize-Newlines {
  param([string]$Text)
  return ($Text -replace "`r`n", "`n" -replace "`r", "`n")
}

function Parse-Frontmatter {
  param([string]$Raw)
  $normalized = Normalize-Newlines $Raw
  $result = [ordered]@{
    body = $normalized
    meta = @{}
  }
  if ($normalized -notmatch "^---`n") {
    return $result
  }
  if ($normalized -notmatch "(?s)^---`n(.*?)`n---`n(.*)$") {
    return $result
  }

  $metaBlock = $matches[1]
  $body = $matches[2]
  $meta = @{}
  foreach ($line in ($metaBlock -split "`n")) {
    if ($line -match "^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$") {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      $meta[$key] = $value
    }
  }
  $result.body = $body
  $result.meta = $meta
  return $result
}

function Remove-SignatureFooter {
  param([string]$Body)
  $text = Normalize-Newlines $Body
  $text = [System.Text.RegularExpressions.Regex]::Replace($text, "(?s)`n---`n_.*?_\s*$", "")
  return $text.Trim() + "`n"
}

function Build-MetaLine {
  param([hashtable]$Meta)
  if ($null -eq $Meta -or $Meta.Count -eq 0) {
    return ""
  }
  $parts = @()
  if ($Meta.ContainsKey("last-reviewed")) { $parts += "Reviewed: $($Meta["last-reviewed"])" }
  if ($Meta.ContainsKey("status")) { $parts += "Status: $($Meta["status"])" }
  if ($Meta.ContainsKey("script-version")) { $parts += "Script version: $($Meta["script-version"])" }
  return ($parts -join " | ")
}

function Insert-MetaLine {
  param(
    [string]$Body,
    [string]$MetaLine
  )
  if ([string]::IsNullOrWhiteSpace($MetaLine)) {
    return $Body
  }
  $text = Normalize-Newlines $Body
  if ($text -match "^(# .+?`n)(`n)?") {
    $header = $matches[1]
    $rest = $text.Substring($header.Length).TrimStart("`n")
    return ($header + "`n> " + $MetaLine + "`n`n" + $rest).Trim() + "`n"
  }
  return ("> " + $MetaLine + "`n`n" + $text.Trim()) + "`n"
}

function Get-RelativeLinkPath {
  param(
    [string]$FromFile,
    [string]$ToFile
  )
  $fromDir = Split-Path -Parent $FromFile
  $fromUri = New-Object System.Uri(($fromDir.TrimEnd("\") + "\"))
  $toUri = New-Object System.Uri($ToFile)
  $relative = [System.Uri]::UnescapeDataString($fromUri.MakeRelativeUri($toUri).ToString())
  return $relative
}

function Rewrite-InternalLinks {
  param(
    [string]$Body,
    [string]$SourceAbs,
    [string]$OutputAbs,
    [hashtable]$SourceToOutputMap
  )

  $text = Normalize-Newlines $Body
  $pattern = "\[([^\]]+)\]\(([^)]+)\)"
  $rewritten = [System.Text.RegularExpressions.Regex]::Replace(
    $text,
    $pattern,
    {
      param($m)
      $label = $m.Groups[1].Value
      $target = $m.Groups[2].Value.Trim()

      if ([string]::IsNullOrWhiteSpace($target)) { return $m.Value }
      if ($target -match "^(https?://|mailto:|#)") { return $m.Value }

      $anchor = ""
      $query = ""
      $targetNoQuery = $target
      if ($targetNoQuery.Contains("?")) {
        $parts = $targetNoQuery.Split("?", 2)
        $targetNoQuery = $parts[0]
        $query = "?" + $parts[1]
      }
      if ($targetNoQuery.Contains("#")) {
        $parts = $targetNoQuery.Split("#", 2)
        $targetNoQuery = $parts[0]
        $anchor = "#" + $parts[1]
      }

      if ([string]::IsNullOrWhiteSpace($targetNoQuery)) {
        return "[$label]($anchor$query)"
      }

      $sourceDir = Split-Path -Parent $SourceAbs
      $resolved = [System.IO.Path]::GetFullPath((Join-Path $sourceDir $targetNoQuery))

      if (-not $SourceToOutputMap.ContainsKey($resolved)) {
        return $m.Value
      }

      $targetOutput = $SourceToOutputMap[$resolved]
      $relative = Get-RelativeLinkPath -FromFile $OutputAbs -ToFile $targetOutput
      $newTarget = ($relative -replace "\\", "/") + $anchor + $query
      return "[$label]($newTarget)"
    }
  )

  return $rewritten
}

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

$repoRoot = Resolve-RepoRoot $RepoRoot
$docsRoot = Join-Path $repoRoot "docs"

if (-not (Test-Path -LiteralPath $docsRoot)) {
  throw "Docs directory not found: $docsRoot"
}

$notionRootName = "State of Mind Vault Restock Documentation Hub"
$outputRootResolved = if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  Join-Path (Join-Path $repoRoot "notion-import") $notionRootName
} else {
  [System.IO.Path]::GetFullPath($OutputRoot)
}

$contentPages = @(
  @{ source = "docs/users/quick-start.md"; output = "Staff/Quick Start.md" },
  @{ source = "docs/users/user-manual.md"; output = "Staff/User Manual.md" },
  @{ source = "docs/users/quick-reference-card.md"; output = "Staff/Quick Reference Card.md" },
  @{ source = "docs/managers/start-here.md"; output = "Managers/Start Here.md" },
  @{ source = "docs/managers/how-decisions-are-made.md"; output = "Managers/How Decisions Are Made.md" },
  @{ source = "docs/managers/when-to-override.md"; output = "Managers/When to Override.md" },
  @{ source = "docs/managers/operations-guide.md"; output = "Managers/Operations Guide.md" },
  @{ source = "docs/managers/faq.md"; output = "Managers/FAQ.md" },
  @{ source = "docs/managers/cutover-brief-script.md"; output = "Managers/Cutover Brief Script.md" },
  @{ source = "docs/managers/cutover-week-checkins.md"; output = "Managers/Cutover Week Check-ins.md" },
  @{ source = "docs/runbooks/index.md"; output = "Runbooks/Runbooks Index.md" },
  @{ source = "docs/runbooks/blocked-schema.md"; output = "Runbooks/BLOCKED_SCHEMA.md" },
  @{ source = "docs/runbooks/blocked-preflight.md"; output = "Runbooks/BLOCKED_PREFLIGHT.md" },
  @{ source = "docs/runbooks/skipped-locked.md"; output = "Runbooks/SKIPPED_LOCKED.md" },
  @{ source = "docs/runbooks/skipped-duplicate.md"; output = "Runbooks/SKIPPED_DUPLICATE.md" },
  @{ source = "docs/runbooks/failed-stage-checklist.md"; output = "Runbooks/FAILED_STAGE_CHECKLIST.md" },
  @{ source = "docs/runbooks/failed-stage-compliance.md"; output = "Runbooks/FAILED_STAGE_COMPLIANCE.md" },
  @{ source = "docs/runbooks/failed-exception.md"; output = "Runbooks/FAILED_EXCEPTION.md" },
  @{ source = "docs/admins/deployment-guide.md"; output = "Admins/Deployment Guide.md" },
  @{ source = "docs/developers/architecture.md"; output = "Developers/Architecture.md" },
  @{ source = "docs/developers/code-map.md"; output = "Developers/Code Map.md" },
  @{ source = "docs/developers/stocking-rules-test-guide.md"; output = "Developers/Stocking Rules Test Guide.md" },
  @{ source = "docs/standards/style-guide.md"; output = "Developers/Documentation Style Guide.md" },
  @{ source = "docs/agents/agent-quickstart.md"; output = "Agents/Agent Quickstart.md" },
  @{ source = "docs/reference/index.md"; output = "Reference/Reference Index.md" },
  @{ source = "docs/reference/test-data/README.md"; output = "Reference/Fixture Test Data.md" },
  @{ source = "docs/reference/specs/README.md"; output = "Reference/Legacy Specs.md" },
  @{ source = "docs/reference/agent/README.md"; output = "Reference/Legacy Agent Docs.md" },
  @{ source = "docs/ownership.md"; output = "Ownership.md" },
  @{ source = "docs/changelog.md"; output = "Changelog.md" },
  @{ source = "docs/product/future-features-backlog.md"; output = "Future Features Backlog.md" }
)

$assetFiles = @(
  @{ source = "docs/reference/test-data/fixture-manifest.csv"; output = "Reference/fixture-manifest.csv" }
)

$sourceToOutput = @{}
foreach ($page in $contentPages) {
  $srcAbs = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $page.source))
  $outAbs = [System.IO.Path]::GetFullPath((Join-Path $outputRootResolved $page.output))
  $sourceToOutput[$srcAbs] = $outAbs
}
foreach ($asset in $assetFiles) {
  $srcAbs = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $asset.source))
  $outAbs = [System.IO.Path]::GetFullPath((Join-Path $outputRootResolved $asset.output))
  $sourceToOutput[$srcAbs] = $outAbs
}

if (Test-Path -LiteralPath $outputRootResolved) {
  Remove-Item -LiteralPath $outputRootResolved -Recurse -Force
}
Ensure-Dir $outputRootResolved

$topLevelPages = @{
  "Home.md" = @'
# Home

This is the operational homepage for the State of Mind Vault Restock documentation system.

## Purpose

Use this wiki as the daily runbook manual for staff, managers, admins, developers, and agents.

## Runtime Note

After `Run Daily Update`, the workbook opens `Compliance Alerts` when issues exist; otherwise it opens `Restock List`.

## Role Routes

- Staff: [Staff](Staff.md)
- Managers: [Managers](Managers.md)
- Run outcomes and failures: [Runbooks](Runbooks.md)
- Admin setup and controls: [Admins](Admins.md)
- System internals: [Developers](Developers.md)
- AI implementation constraints: [Agents](Agents.md)
- Current vs legacy reference: [Reference](Reference.md)

## Quick Links

- [Ownership](Ownership.md)
- [Changelog](Changelog.md)
- [Future Features Backlog](Future Features Backlog.md)
'@
  "Staff.md" = @'
# Staff

Daily operator docs for import, run, and execution workflow.

- [Quick Start](Staff/Quick Start.md)
- [User Manual](Staff/User Manual.md)
- [Quick Reference Card](Staff/Quick Reference Card.md)
'@
  "Managers.md" = @'
# Managers

Governance, escalation, and operational decision support.

- [Start Here](Managers/Start Here.md)
- [How Decisions Are Made](Managers/How Decisions Are Made.md)
- [When to Override](Managers/When to Override.md)
- [Operations Guide](Managers/Operations Guide.md)
- [FAQ](Managers/FAQ.md)
- [Cutover Brief Script](Managers/Cutover Brief Script.md)
- [Cutover Week Check-ins](Managers/Cutover Week Check-ins.md)
'@
  "Runbooks.md" = @'
# Runbooks

Use runbooks by matching the exact `Run_Journal.outcome` value.

- [Runbooks Index](Runbooks/Runbooks Index.md)
- [BLOCKED_SCHEMA](Runbooks/BLOCKED_SCHEMA.md)
- [BLOCKED_PREFLIGHT](Runbooks/BLOCKED_PREFLIGHT.md)
- [SKIPPED_LOCKED](Runbooks/SKIPPED_LOCKED.md)
- [SKIPPED_DUPLICATE](Runbooks/SKIPPED_DUPLICATE.md)
- [FAILED_STAGE_CHECKLIST](Runbooks/FAILED_STAGE_CHECKLIST.md)
- [FAILED_STAGE_COMPLIANCE](Runbooks/FAILED_STAGE_COMPLIANCE.md)
- [FAILED_EXCEPTION](Runbooks/FAILED_EXCEPTION.md)
'@
  "Admins.md" = @'
# Admins

Deployment, trigger setup, validation, and restore procedures.

- [Deployment Guide](Admins/Deployment Guide.md)
'@
  "Developers.md" = @'
# Developers

Implementation-safe architecture, code map, and test guidance.

- [Architecture](Developers/Architecture.md)
- [Code Map](Developers/Code Map.md)
- [Stocking Rules Test Guide](Developers/Stocking Rules Test Guide.md)
- [Documentation Style Guide](Developers/Documentation Style Guide.md)
'@
  "Agents.md" = @'
# Agents

Constrained AI coding entrypoint and required read order.

- [Agent Quickstart](Agents/Agent Quickstart.md)
'@
  "Reference.md" = @'
# Reference

Current reference is authoritative for live operations and implementation.

Legacy material is historical only and non-authoritative.

- [Reference Index](Reference/Reference Index.md)
- [Fixture Test Data](Reference/Fixture Test Data.md)
- [Legacy Specs](Reference/Legacy Specs.md)
- [Legacy Agent Docs](Reference/Legacy Agent Docs.md)
'@
}

foreach ($pageName in $topLevelPages.Keys) {
  $target = Join-Path $outputRootResolved $pageName
  Ensure-Dir (Split-Path -Parent $target)
  $content = (Normalize-Newlines $topLevelPages[$pageName]).Trim() + "`n"
  Set-Content -LiteralPath $target -Value $content -Encoding UTF8
}

foreach ($page in $contentPages) {
  $srcAbs = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $page.source))
  $outAbs = [System.IO.Path]::GetFullPath((Join-Path $outputRootResolved $page.output))
  if (-not (Test-Path -LiteralPath $srcAbs)) {
    throw "Missing source file: $srcAbs"
  }
  Ensure-Dir (Split-Path -Parent $outAbs)

  $raw = Get-Content -LiteralPath $srcAbs -Raw -Encoding UTF8
  $parsed = Parse-Frontmatter $raw
  $body = Remove-SignatureFooter $parsed.body
  $metaLine = Build-MetaLine $parsed.meta
  $withMeta = Insert-MetaLine -Body $body -MetaLine $metaLine
  $rewritten = Rewrite-InternalLinks -Body $withMeta -SourceAbs $srcAbs -OutputAbs $outAbs -SourceToOutputMap $sourceToOutput
  Set-Content -LiteralPath $outAbs -Value $rewritten -Encoding UTF8
}

foreach ($asset in $assetFiles) {
  $srcAbs = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $asset.source))
  $outAbs = [System.IO.Path]::GetFullPath((Join-Path $outputRootResolved $asset.output))
  if (-not (Test-Path -LiteralPath $srcAbs)) {
    throw "Missing asset file: $srcAbs"
  }
  Ensure-Dir (Split-Path -Parent $outAbs)
  Copy-Item -LiteralPath $srcAbs -Destination $outAbs -Force
}

$legacySpecsDir = Join-Path $outputRootResolved "legacy/v1/specs"
$legacyAgentDir = Join-Path $outputRootResolved "legacy/v1/agent"
Ensure-Dir $legacySpecsDir
Ensure-Dir $legacyAgentDir
Set-Content -LiteralPath (Join-Path $legacySpecsDir "README.md") -Value "# Legacy Specs (Historical Only)`n`nThis archive path is preserved for historical reference and is non-authoritative for current operations.`n" -Encoding UTF8
Set-Content -LiteralPath (Join-Path $legacyAgentDir "README.md") -Value "# Legacy Agent Docs (Historical Only)`n`nThis archive path is preserved for historical reference and is non-authoritative for current implementation.`n" -Encoding UTF8

$readmePath = Join-Path (Split-Path -Parent $outputRootResolved) "README.md"
$readmeLines = @(
  "# Notion Import Package",
  "",
  "Generated package: $notionRootName",
  "",
  "## Import Steps",
  "",
  "1. In Notion, open `Import`.",
  "2. Choose `Markdown & CSV`.",
  "3. Select the folder:",
  "   - $outputRootResolved",
  "4. Notion creates a top-level page named $notionRootName with nested pages.",
  "",
  "## Notes",
  "",
  "- Content is sourced from the active Markdown docs in this repository.",
  "- YAML frontmatter is removed for reader-facing pages.",
  "- Internal links are remapped to the new Notion-oriented structure.",
  "- Runbook outcome names and operational terminology are preserved."
)
$readme = ($readmeLines -join "`n")
Set-Content -LiteralPath $readmePath -Value ((Normalize-Newlines $readme).Trim() + "`n") -Encoding UTF8

Write-Host "Built Notion import package:"
Write-Host " - Root page folder: $outputRootResolved"
Write-Host " - Import instructions: $readmePath"
