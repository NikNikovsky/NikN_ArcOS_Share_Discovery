# Offline checks for the file-access half of agent.ps1.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tests\share-fs-harness.ps1
#
# Pulls the "file access" block out of agent.ps1 and calls it against a scratch
# directory, so the path guard, the directory listing, stat and read are checked
# without a network, a share, or the helper's HTTP loop. It cannot prove that a
# real SMB session authenticates - only the live app can - but it does prove the
# JSON shapes and the traversal guard, which are the parts a bug would destroy
# data with.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$agent = Join-Path $root "src\agent\agent.ps1"
$text = [System.IO.File]::ReadAllText($agent)

$startMarker = "# ---------------------------------------------------------------- file access"
$endMarker = "# ----------------------------------------------------------------- routing"
$start = $text.IndexOf($startMarker)
$end = $text.IndexOf($endMarker)
if ($start -lt 0 -or $end -lt 0 -or $end -le $start) {
	Write-Host "FAIL could not find the file access block in agent.ps1" -ForegroundColor Red
	exit 1
}
$block = $text.Substring($start, $end - $start)

# The block is written for the helper's script scope; give it the same here.
$script:NetCalls = New-Object System.Collections.ArrayList

function Invoke-NetCommand {
	param([string[]]$Arguments, [int]$TimeoutMs = 45000)
	$null = $script:NetCalls.Add(($Arguments -join " "))
	return @{ code = 0; text = "The command completed successfully." }
}

function Write-AgentLog {
	param([string]$Message)
	# The harness has no console window to write to.
}

Invoke-Expression $block

# The block calls these from the share section; they are pure, so lift them out
# by name instead of splitting the file with more markers.
$ast = [System.Management.Automation.Language.Parser]::ParseFile($agent, [ref]$null, [ref]$null)
$needed = @("Get-UserCandidates", "Get-NetErrorCode", "Get-NetUseReason", "Get-NetMessage", "Quote-NetArgument", "Get-JsonValue")
$found = $ast.FindAll({
	param($node)
	($node -is [System.Management.Automation.Language.FunctionDefinitionAst]) -and ($needed -contains $node.Name)
}, $true)
foreach ($fn in $found) { Invoke-Expression $fn.Extent.Text }
foreach ($name in $needed) {
	if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
		Write-Host ("FAIL could not lift {0} out of agent.ps1" -f $name) -ForegroundColor Red
		exit 1
	}
}

$failures = 0
function Assert($label, $condition, $extra) {
	if ($condition) {
		Write-Host "ok   $label"
	} else {
		$script:failures++
		Write-Host "FAIL $label" -ForegroundColor Red
		if ($null -ne $extra) { Write-Host "     $extra" -ForegroundColor DarkGray }
	}
}

# --------------------------------------------------------------- scratch data

$scratch = Join-Path ([System.IO.Path]::GetTempPath()) ("arcsd-fs-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$null = New-Item -ItemType Directory -Path $scratch -Force
$null = New-Item -ItemType Directory -Path (Join-Path $scratch "media") -Force
[System.IO.File]::WriteAllText((Join-Path $scratch "notes.txt"), "hello from the harness`r`n")
[System.IO.File]::WriteAllText((Join-Path $scratch "media\photo.jpg"), "not really a jpg")
$hidden = Join-Path $scratch "secret.txt"
[System.IO.File]::WriteAllText($hidden, "hidden")
[System.IO.File]::SetAttributes($hidden, [System.IO.FileAttributes]::Hidden)

# A junction is what the drive must skip: following one can loop forever.
$junction = Join-Path $scratch "loop"
$null = & cmd.exe /c mklink /J "`"$junction`"" "`"$scratch`"" 2>&1

try {
	# ------------------------------------------------------------ UNC parsing
	Assert "a share root is accepted" (Test-UncRoot -Root "\\nas01\media")
	Assert "an admin share is accepted" (Test-UncRoot -Root "\\nas01\C$")
	Assert "a bare host is rejected" (-not (Test-UncRoot -Root "\\nas01"))
	Assert "a full path is rejected" (-not (Test-UncRoot -Root "\\nas01\media\sub"))
	Assert "a drive path is rejected" (-not (Test-UncRoot -Root "C:\media"))

	Assert "the host is pulled out of a UNC root" ((Get-UncHost -Root "\\nas01\media") -eq "nas01")
	Assert "a drive path has no UNC host" ((Get-UncHost -Root "C:\media") -eq "")

	# ------------------------------------------------------------- path guard
	$ok = ConvertTo-SharePath -Root "\\nas01\media" -Relative "photos\2024\a.jpg"
	Assert "a nested path is joined" ($ok -eq "\\nas01\media\photos\2024\a.jpg") $ok

	$ok = ConvertTo-SharePath -Root "\\nas01\media" -Relative "/photos/2024/a.jpg"
	Assert "forward slashes are accepted" ($ok -eq "\\nas01\media\photos\2024\a.jpg") $ok

	$ok = ConvertTo-SharePath -Root "\\nas01\media" -Relative ""
	Assert "the share root itself is allowed" ($ok -eq "\\nas01\media") $ok

	Assert "a parent segment is refused" ($null -eq (ConvertTo-SharePath -Root "\\nas01\media" -Relative "..\..\Windows"))
	Assert "a parent segment mid-path is refused" ($null -eq (ConvertTo-SharePath -Root "\\nas01\media" -Relative "photos\..\..\Windows"))
	Assert "a dot segment is refused" ($null -eq (ConvertTo-SharePath -Root "\\nas01\media" -Relative ".\photos"))
	Assert "a drive letter is refused" ($null -eq (ConvertTo-SharePath -Root "\\nas01\media" -Relative "C:\Windows"))
	Assert "a wildcard is refused" ($null -eq (ConvertTo-SharePath -Root "\\nas01\media" -Relative "*.txt"))
	Assert "a trailing dot is refused" ($null -eq (ConvertTo-SharePath -Root "\\nas01\media" -Relative "photos.\x"))

	# --------------------------------------------------------------- listing
	$listing = Invoke-FsList -Root $scratch -Relative "" -Username "" -Password "" -Domain ""
	Assert "a listing succeeds" ($listing.Status -eq 200) ($listing.Payload | ConvertTo-Json -Compress)
	$names = @($listing.Payload.entries | ForEach-Object { $_.name })
	Assert "the file is listed" ($names -contains "notes.txt") ($names -join ",")
	Assert "the folder is listed" ($names -contains "media") ($names -join ",")
	Assert "the hidden file is listed too" ($names -contains "secret.txt") ($names -join ",")
	Assert "the junction is skipped" ($names -notcontains "loop") ($names -join ",")
	Assert "the count matches" ($listing.Payload.count -eq $names.Count) ("count " + $listing.Payload.count + " vs " + $names.Count)

	$first = $listing.Payload.entries[0]
	Assert "folders sort before files" ($first.isDir -eq $true) ($first | ConvertTo-Json -Compress)

	$file = $listing.Payload.entries | Where-Object { $_.name -eq "notes.txt" }
	Assert "the file size is reported" ($file.size -eq 24) ("size " + $file.size)
	Assert "the modification time is epoch ms" ($file.modified -gt 1600000000000) ("modified " + $file.modified)
	Assert "the hidden flag is carried" (($listing.Payload.entries | Where-Object { $_.name -eq "secret.txt" }).hidden -eq $true)

	$sub = Invoke-FsList -Root $scratch -Relative "media" -Username "" -Password "" -Domain ""
	Assert "a subfolder lists" ($sub.Status -eq 200 -and $sub.Payload.count -eq 1) ($sub.Payload | ConvertTo-Json -Compress)
	Assert "the subfolder file is named" ($sub.Payload.entries[0].name -eq "photo.jpg")

	Assert "anonymous listing calls net.exe zero times" ($script:NetCalls.Count -eq 0) ($script:NetCalls -join "; ")

	# ------------------------------------------------------------------- stat
	$stat = Invoke-FsStat -Root $scratch -Relative "notes.txt" -Username "" -Password "" -Domain ""
	Assert "stat answers for a file" ($stat.Status -eq 200 -and $stat.Payload.isFile -eq $true) ($stat.Payload | ConvertTo-Json -Compress)
	Assert "stat reports the size" ($stat.Payload.size -eq 24) ("size " + $stat.Payload.size)

	$statDir = Invoke-FsStat -Root $scratch -Relative "" -Username "" -Password "" -Domain ""
	Assert "stat answers for the root" ($statDir.Status -eq 200 -and $statDir.Payload.isDirectory -eq $true)

	$missing = Invoke-FsStat -Root $scratch -Relative "nope.txt" -Username "" -Password "" -Domain ""
	Assert "a missing file becomes 404" ($missing.Status -eq 404) ("status " + $missing.Status)
	Assert "a missing file says not_found" ($missing.Payload.error -eq "not_found") ($missing.Payload.error + " / " + $missing.Payload.detail)

	$escape = Invoke-FsList -Root $scratch -Relative "..\Windows" -Username "" -Password "" -Domain ""
	Assert "a traversal is refused before touching the disk" ($escape.Status -eq 400 -and $escape.Payload.error -eq "bad_path") ($escape.Payload | ConvertTo-Json -Compress)

	# ------------------------------------------------------------------- read
	$read = Invoke-FsRead -Root $scratch -Relative "notes.txt" -Username "" -Password "" -Domain ""
	Assert "a read succeeds" ($read.Status -eq 200) ($read.Payload | ConvertTo-Json -Compress)
	$decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($read.Payload.data))
	Assert "the bytes survive base64" ($decoded -eq "hello from the harness`r`n") $decoded
	Assert "the size is reported" ($read.Payload.size -eq 24)

	$readDir = Invoke-FsRead -Root $scratch -Relative "media" -Username "" -Password "" -Domain ""
	Assert "reading a folder is refused" ($readDir.Status -eq 400 -and $readDir.Payload.error -eq "not_a_file") ($readDir.Payload | ConvertTo-Json -Compress)

	$readRoot = Invoke-FsRead -Root $scratch -Relative "" -Username "" -Password "" -Domain ""
	Assert "reading the share root is refused" ($readRoot.Status -eq 400) ("status " + $readRoot.Status)

	$bigPath = Join-Path $scratch "big.bin"
	$stream = [System.IO.File]::Open($bigPath, [System.IO.FileMode]::Create)
	$stream.SetLength(17MB)
	$stream.Close()
	$big = Invoke-FsRead -Root $scratch -Relative "big.bin" -Username "" -Password "" -Domain ""
	Assert "an oversized file is refused" ($big.Status -eq 413 -and $big.Payload.error -eq "too_large") ($big.Payload | ConvertTo-Json -Compress)
	Assert "the refusal names the limit" ($big.Payload.detail -match "16 MB") ($big.Payload.detail)

	# ----------------------------------------------------------- error mapping
	$record = New-Object System.Management.Automation.ErrorRecord(
		(New-Object System.IO.FileNotFoundException("gone")),
		"gone",
		[System.Management.Automation.ErrorCategory]::ObjectNotFound,
		$null
	)
	$mapped = New-FsErrorResult -HostName "nas01" -ErrorRecord $record -What "Listing" -Anonymous $false
	Assert "a not-found error maps to 404" ($mapped.Status -eq 404) ("status " + $mapped.Status)
	Assert "a not-found error carries a detail" ([bool]$mapped.Payload.detail) $mapped.Payload.detail
	Assert "the detail names the Win32 code" ($mapped.Payload.detail -match "Win32") $mapped.Payload.detail

	$deniedRecord = New-Object System.Management.Automation.ErrorRecord(
		(New-Object System.UnauthorizedAccessException("denied")),
		"denied",
		[System.Management.Automation.ErrorCategory]::PermissionDenied,
		$null
	)
	$anon = New-FsErrorResult -HostName "nas01" -ErrorRecord $deniedRecord -What "Listing" -Anonymous $true
	Assert "an anonymous refusal says anonymous" ($anon.Payload.error -eq "anonymous") ($anon.Payload.error)
	$authed = New-FsErrorResult -HostName "nas01" -ErrorRecord $deniedRecord -What "Listing" -Anonymous $false
	Assert "a credentialed refusal says access_denied" ($authed.Payload.error -eq "access_denied") ($authed.Payload.error)

	# ---------------------------------------------------------------- routing
	# A typo in the route table is a silent 404 in the app, so lift the routing
	# function as well and post bodies at it. Nothing here opens a socket. The
	# real functions are shadowed with probes so no UNC root has to resolve.
	$script:RouteCalls = New-Object System.Collections.ArrayList
	function Invoke-FsList  { param($Root, $Relative, $Username, $Password, $Domain)
		$null = $script:RouteCalls.Add(("list|" + $Root + "|" + $Relative + "|" + $Username + "|pw=" + [bool]$Password))
		return @{ Status = 200; Payload = @{ entries = @(); count = 0; path = $Relative } } }
	function Invoke-FsStat  { param($Root, $Relative, $Username, $Password, $Domain)
		$null = $script:RouteCalls.Add(("stat|" + $Root + "|" + $Relative + "|" + $Username))
		return @{ Status = 200; Payload = @{ isFile = $false; isDirectory = $true } } }
	function Invoke-FsRead  { param($Root, $Relative, $Username, $Password, $Domain)
		$null = $script:RouteCalls.Add(("read|" + $Root + "|" + $Relative + "|" + $Username))
		return @{ Status = 200; Payload = @{ data = ""; size = 0 } } }

	$routerNode = $ast.Find({
		param($node)
		($node -is [System.Management.Automation.Language.FunctionDefinitionAst]) -and ($node.Name -eq "Invoke-ApiRequest")
	}, $true)
	if ($null -eq $routerNode) {
		Write-Host "FAIL could not lift Invoke-ApiRequest out of agent.ps1" -ForegroundColor Red
		exit 1
	}
	Invoke-Expression $routerNode.Extent.Text

	function Invoke-Route($path, $payload) {
		$body = ""
		if ($null -ne $payload) { $body = ($payload | ConvertTo-Json -Compress) }
		return Invoke-ApiRequest -Request @{ Method = "POST"; Path = $path; Body = $body }
	}

	$routed = Invoke-Route "/fs/list" @{ unc = "\\nas01\media"; path = "photos"; username = "alice"; password = "nope"; domain = "CONTOSO" }
	Assert "POST /fs/list is routed" ($routed.Status -eq 200) ($routed | ConvertTo-Json -Depth 4 -Compress)
	Assert "the body fields reach the handler" ($script:RouteCalls[-1] -eq "list|\\nas01\media|photos|alice|pw=True") ($script:RouteCalls[-1])

	$routedStat = Invoke-Route "/fs/stat" @{ unc = "\\nas01\media"; path = "notes.txt"; username = "alice" }
	Assert "POST /fs/stat is routed" ($routedStat.Status -eq 200 -and $routedStat.Payload.isDirectory -eq $true) ($routedStat.Status)
	Assert "stat passes the path through" ($script:RouteCalls[-1] -eq "stat|\\nas01\media|notes.txt|alice") ($script:RouteCalls[-1])

	$routedRead = Invoke-Route "/fs/read" @{ unc = "\\nas01\media"; path = "notes.txt" }
	Assert "POST /fs/read is routed" ($routedRead.Status -eq 200) ($routedRead.Status)
	Assert "read passes the path through" ($script:RouteCalls[-1] -eq "read|\\nas01\media|notes.txt|") ($script:RouteCalls[-1])

	$routedBadUnc = Invoke-Route "/fs/list" @{ unc = "C:\media"; path = "" }
	Assert "a non-UNC root is refused by the router" ($routedBadUnc.Status -eq 400 -and $routedBadUnc.Payload.error -eq "bad_unc") ($routedBadUnc.Status)

	$routedNoBody = Invoke-Route "/fs/list" $null
	Assert "a bodyless request is refused, not crashed" ($routedNoBody.Status -eq 400 -and $routedNoBody.Payload.error -eq "bad_unc") ($routedNoBody.Status)

	$routedUnknown = Invoke-Route "/fs/nothing" @{ unc = "\\nas01\media" }
	Assert "an unknown fs route is a 404, not a crash" ($routedUnknown.Status -eq 404) ($routedUnknown.Status)

	# --------------------------------------------------------------- time math
	$epoch = ConvertTo-UnixMs -Value ([datetime]::SpecifyKind([datetime]::ParseExact("1970-01-02", "yyyy-MM-dd", [System.Globalization.CultureInfo]::InvariantCulture), [System.DateTimeKind]::Utc))
	Assert "one day after the epoch is 86400000 ms" ($epoch -eq 86400000) ("got " + $epoch)

	# ---------------------------------------------------------- session cache
	$script:FsSessions.Clear()
	$unauth = Connect-FsSession -Root "\\nas01\media" -HostName "nas01" -Username "alice" -Password "" -Domain ""
	Assert "a username without a password is not attempted" ($unauth.ok -eq $true -and $unauth.anonymous -eq $true)
	Assert "no net.exe call was made for it" ($script:NetCalls.Count -eq 0) ($script:NetCalls -join "; ")
} finally {
	Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
if ($failures -gt 0) {
	Write-Host ("{0} FAILED" -f $failures) -ForegroundColor Red
	exit 1
}
Write-Host "all file-access checks passed" -ForegroundColor Green
exit 0
