[CmdletBinding()]
param(
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
    $RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$taskName = "Techniek TwinSim Nightly Refinement"
$logRoot = Join-Path $env:LOCALAPPDATA "TechniekTwinSimStudio\logs"
$toolRoot = Join-Path $env:LOCALAPPDATA "TechniekTwinSimStudio\tools"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logRoot "nightly-$timestamp.log"
$lastMessageFile = Join-Path $logRoot "last-message-$timestamp.txt"

New-Item -ItemType Directory -Force -Path $logRoot, $toolRoot | Out-Null

function Write-RunLog {
    param([string]$Message)
    $line = "[$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")] $Message"
    Write-Host $line
    Add-Content -LiteralPath $logFile -Value $line
}

function Get-Sha256 {
    param([string]$Value)
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "")
    }
    finally {
        $sha.Dispose()
    }
}

function Get-DependencyFingerprint {
    $package = Get-Content -Raw -LiteralPath (Join-Path $RepoPath "package.json") | ConvertFrom-Json
    $dependencyState = [ordered]@{
        dependencies = $package.dependencies
        devDependencies = $package.devDependencies
    }
    return Get-Sha256 ($dependencyState | ConvertTo-Json -Depth 20 -Compress)
}

function Resolve-Npm {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npm) {
        return $npm.Source
    }

    $nodeHome = Join-Path $toolRoot "node"
    $npmPath = Join-Path $nodeHome "npm.cmd"
    if (Test-Path -LiteralPath $npmPath) {
        $env:PATH = "$nodeHome;$env:PATH"
        return $npmPath
    }

    Write-RunLog "npm was not found. Bootstrapping the current Node 22 LTS Windows archive from nodejs.org."
    $index = Invoke-WebRequest -Uri "https://nodejs.org/dist/latest-v22.x/" -UseBasicParsing
    $match = [regex]::Match($index.Content, 'node-v22[^"'']*-win-x64\.zip')
    if (-not $match.Success) {
        throw "Could not locate the latest Node 22 Windows archive."
    }

    $zipName = $match.Value
    $zipPath = Join-Path $toolRoot $zipName
    $extractRoot = Join-Path $toolRoot "node-extract"
    Invoke-WebRequest -Uri ("https://nodejs.org/dist/latest-v22.x/" + $zipName) -OutFile $zipPath -UseBasicParsing

    $resolvedToolRoot = [IO.Path]::GetFullPath($toolRoot)
    foreach ($target in @($nodeHome, $extractRoot)) {
        $resolvedTarget = [IO.Path]::GetFullPath($target)
        if (-not $resolvedTarget.StartsWith($resolvedToolRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Unsafe Node extraction target: $resolvedTarget"
        }
        if (Test-Path -LiteralPath $resolvedTarget) {
            Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
        }
    }

    New-Item -ItemType Directory -Path $extractRoot | Out-Null
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force
    $expandedNode = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
    if (-not $expandedNode) {
        throw "Node archive did not contain an expected directory."
    }
    Move-Item -LiteralPath $expandedNode.FullName -Destination $nodeHome
    Remove-Item -LiteralPath $extractRoot -Recurse -Force
    Remove-Item -LiteralPath $zipPath -Force

    $env:PATH = "$nodeHome;$env:PATH"
    if (-not (Test-Path -LiteralPath $npmPath)) {
        throw "npm was not found after Node bootstrap."
    }
    return $npmPath
}

function Invoke-LoggedCommand {
    param(
        [string]$Executable,
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    Write-RunLog ("Running: " + $Executable + " " + ($Arguments -join " "))
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $Executable @Arguments 2>&1 | Tee-Object -FilePath $logFile -Append
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Command failed with exit code ${exitCode}: $Executable $($Arguments -join " ")"
    }
    return $exitCode
}

$mutex = New-Object Threading.Mutex($false, "TechniekTwinSimNightlyRefinement")
$hasLock = $false

try {
    $hasLock = $mutex.WaitOne(0)
    if (-not $hasLock) {
        Write-RunLog "$taskName is already running. Exiting."
        exit 0
    }

    Set-Location -LiteralPath $RepoPath
    Write-RunLog "Starting $taskName in $RepoPath."

    $possibleSiteRoot = [IO.Path]::GetFullPath((Join-Path $RepoPath "..\.."))
    $expectedNestedPath = [IO.Path]::GetFullPath((Join-Path $possibleSiteRoot "tools\techniek-twinsim-studio"))
    $isNestedSiteTool =
        (Test-Path -LiteralPath (Join-Path $possibleSiteRoot ".git")) -and
        ([IO.Path]::GetFullPath($RepoPath) -eq $expectedNestedPath)

    if ($isNestedSiteTool) {
        $gitRoot = $possibleSiteRoot
        $gitScopes = @(
            "tools/techniek-twinsim-studio",
            "outputs/tools/techniek-twinsim-studio"
        )
        Write-RunLog "Detected nested Techniek Project Site tool. Git operations are scoped to TwinSim source and published output."
    }
    else {
        $gitRoot = (& git rev-parse --show-toplevel).Trim()
        $gitScopes = @(".")
    }

    $dirty = & git -C $gitRoot status --porcelain -- @gitScopes
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read scoped git status."
    }
    if ($dirty) {
        Write-RunLog "Skipped: TwinSim source or published output has uncommitted changes. Preserve and review them before the next scheduled run."
        exit 0
    }

    $branch = (& git -C $gitRoot branch --show-current).Trim()
    if ($branch -ne "main") {
        Write-RunLog "Skipped: expected branch main, found $branch."
        exit 0
    }

    $remoteNames = @(& git -C $gitRoot remote)
    $hasOrigin = $remoteNames -contains "origin"
    $origin = if ($hasOrigin) { (& git -C $gitRoot remote get-url origin).Trim() } else { $null }
    if ($origin) {
        $parentDirty = & git -C $gitRoot status --porcelain
        if ($isNestedSiteTool -and $parentDirty) {
            Write-RunLog "Parent site has unrelated uncommitted work. Skipping pull and continuing with scoped TwinSim paths only."
        }
        else {
            Invoke-LoggedCommand -Executable "git" -Arguments @("-C", $gitRoot, "pull", "--ff-only", "origin", "main")
        }
    }
    else {
        Write-RunLog "No origin remote is configured. The run may commit locally but will not push."
    }

    $npmPath = Resolve-Npm
    $codex = Get-Command codex.exe -ErrorAction Stop
    $dependencyFingerprintBefore = Get-DependencyFingerprint

    Invoke-LoggedCommand -Executable $npmPath -Arguments @("install", "--no-audit", "--no-fund") -AllowFailure | Out-Null

    foreach ($check in @(
        @("run", "build"),
        @("run", "validate:scenarios"),
        @("run", "smoke")
    )) {
        Invoke-LoggedCommand -Executable $npmPath -Arguments $check -AllowFailure | Out-Null
    }

    $dailyLog = Get-Content -Raw -LiteralPath (Join-Path $RepoPath "automation\daily-log.md")
    $successfulRuns = ([regex]::Matches($dailyLog, "Status: SUCCESS")).Count
    $runNumber = $successfulRuns + 1
    if ($runNumber -le 3) {
        $stage = "Stage 1 - Observe and stabilize"
    }
    elseif ($runNumber -le 14) {
        $stage = "Stage 2 - Strengthen the product"
    }
    else {
        $stage = "Stage 3 - Polish and deepen"
    }

    $promptPath = Join-Path $RepoPath "automation\nightly-refinement-prompt.md"
    $prompt = Get-Content -Raw -LiteralPath $promptPath
    $runtimeContext = @"
Automation runtime context:
- Local date: $(Get-Date -Format "yyyy-MM-dd")
- Scheduled run number: $runNumber
- Maturity stage: $stage
- TwinSim project root: $RepoPath
- Git root: $gitRoot
- Allowed git paths: $($gitScopes -join ", ")
- This is an unattended run. Protect user work. Do not edit parent-site files outside the allowed git paths.

"@

    Write-RunLog "Launching Codex research and refinement run $runNumber at $stage."
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        ($runtimeContext + $prompt) |
            & $codex.Source --search --sandbox danger-full-access --ask-for-approval never exec --cd $RepoPath --output-last-message $lastMessageFile - 2>&1 |
            Tee-Object -FilePath $logFile -Append
        $codexExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }
    if ($codexExitCode -ne 0) {
        throw "Codex refinement failed with exit code $codexExitCode."
    }
    if (Test-Path -LiteralPath $lastMessageFile) {
        $lastMessage = Get-Content -Raw -LiteralPath $lastMessageFile
        if ($lastMessage -match "(?im)^Status:\s*FAILED\b") {
            throw "Codex reported Status: FAILED. See $lastMessageFile."
        }
    }

    $dependencyFingerprintAfter = Get-DependencyFingerprint
    if ($dependencyFingerprintBefore -ne $dependencyFingerprintAfter) {
        Write-RunLog "Stopped: dependency declarations changed without explicit approval. Changes were left for review."
        exit 1
    }

    foreach ($check in @(
        @("run", "build"),
        @("run", "validate:scenarios"),
        @("run", "smoke")
    )) {
        Invoke-LoggedCommand -Executable $npmPath -Arguments $check
    }
    Invoke-LoggedCommand -Executable "git" -Arguments (@("-C", $gitRoot, "diff", "--check", "--") + $gitScopes)

    $changes = & git -C $gitRoot status --porcelain -- @gitScopes
    if (-not $changes) {
        Write-RunLog "Completed successfully with no repository changes."
        exit 0
    }

    Invoke-LoggedCommand -Executable "git" -Arguments (@("-C", $gitRoot, "add", "--") + $gitScopes)
    Invoke-LoggedCommand -Executable "git" -Arguments (@("-C", $gitRoot, "commit", "--only", "-m", "Nightly refinement: $(Get-Date -Format "yyyy-MM-dd")", "--") + $gitScopes)

    if ($origin) {
        Invoke-LoggedCommand -Executable "git" -Arguments @("-C", $gitRoot, "push", "origin", "main")
        Write-RunLog "Completed successfully and pushed to origin/main."
    }
    else {
        Write-RunLog "Completed successfully and committed locally. Push skipped because origin is not configured."
    }
}
catch {
    Write-RunLog ("FAILED: " + $_.Exception.Message)
    exit 1
}
finally {
    if ($hasLock) {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
