# Offline check for share enumeration.
#
# Loads only the share-enumeration block out of src/agent/agent.ps1 and runs
# three kinds of check:
#
#   1. fixture checks against real `net view` output and the pure helpers that
#      turn two credential fields into Windows account names - no network;
#   2. a live check that enumerating the local machine over DCOM returns shares.
#      That is the regression test for the bug this file exists for: using
#      Get-CimInstance -ComputerName (WS-Management) instead of an explicit DCOM
#      session made every enumeration fail on a stock Windows install, where the
#      WinRM service is stopped and disabled;
#   3. optionally, a live check against a real host with real credentials. This
#      is the "it says denied even with the right password" diagnostic: it prints
#      the system error code, the net.exe message and the reason the helper
#      reports, so the failing step is visible.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File tests\share-harness.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File tests\share-harness.ps1 -SkipLive
#   powershell -NoProfile -ExecutionPolicy Bypass -File tests\share-harness.ps1 -Ip 10.20.30.40 -Username alice
#
# With -Username and no -Password the password is read with Read-Host -AsSecureString,
# so it never appears in the command line, in PowerShell history or in this file.
# Pass -ExpectSuccess to make the credentialed run assert instead of just report.

param(
	[string]$Ip = "127.0.0.1",
	[string]$Username = "",
	[string]$Domain = "",
	[securestring]$Password = $null,
	[switch]$SkipLive,
	[switch]$ExpectSuccess
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$text = [System.IO.File]::ReadAllText((Join-Path $root "src\agent\agent.ps1"))

$start = $text.IndexOf("function Test-TcpPort")
$end = $text.IndexOf("# ----------------------------------------------------------------- routing")
if ($start -lt 0 -or $end -lt 0) { throw "could not locate the network and share blocks in agent.ps1" }
Invoke-Expression $text.Substring($start, $end - $start)

# The real helpers log to the console; keep that quiet in a test run.
function Write-AgentLog {
	param([string]$Message)
	Write-Verbose $Message
}

$script:failures = 0

function Assert-Equal {
	param($Label, $Actual, $Expected)
	if ($Actual -eq $Expected) {
		Write-Host ("ok   " + $Label)
	} else {
		Write-Host ("FAIL " + $Label + " :: got " + ($Actual | Out-String).Trim() + " want " + $Expected)
		$script:failures++
	}
}

function Assert-True {
	param($Label, $Actual)
	if ($Actual) {
		Write-Host ("ok   " + $Label)
	} else {
		Write-Host ("FAIL " + $Label)
		$script:failures++
	}
}

# ---------------------------------------------------------------- fixtures

# Captured from Windows 10/11 (`net view \\127.0.0.1 /all`), first two blank
# lines included on purpose: the real command emits them.
$fixture = @(
	"Shared resources at \\127.0.0.1",
	"",
	"",
	"",
	"Share name  Type  Used as  Comment        ",
	"",
	"-------------------------------------------------------------------------------",
	"ADMIN$      Disk           Remote Admin   ",
	"C$          Disk           Default share  ",
	"F$          Disk           Default share  ",
	"IPC$        IPC            Remote IPC     ",
	"The command completed successfully.",
	""
)

$rows = @(ConvertFrom-NetViewOutput -Lines $fixture)
Assert-Equal "windows fixture yields every row" $rows.Count 4
Assert-Equal "first share name" $rows[0].name "ADMIN$"
Assert-Equal "first share type" $rows[0].type "Disk"
Assert-Equal "first share comment" $rows[0].comment "Remote Admin"
Assert-Equal "IPC share keeps its type" $rows[3].type "IPC"
Assert-Equal "IPC share is flagged admin" $rows[3].admin $true
Assert-Equal "header rows are ignored" (@($rows | Where-Object { $_.name -like "Share*" -or $_.name -like "-*" }).Count) 0

# Samba/NetApp sometimes prints the full path in the name column.
$uncRows = @(ConvertFrom-NetViewOutput -Lines @(
	"\\\\NAS01\\media    Disk    Media files",
	"\\\\NAS01\\backup   Disk    Backups"
))
Assert-Equal "UNC-prefixed names are reduced" $uncRows[0].name "media"
Assert-Equal "UNC-prefixed comment" $uncRows[0].comment "Media files"
Assert-Equal "UNC-prefixed rows counted" $uncRows.Count 2

# Share names may contain single spaces; the columns are padded.
$spaceRows = @(ConvertFrom-NetViewOutput -Lines @("My Files    Disk    Shared folder"))
Assert-Equal "name with a single space" $spaceRows[0].name "My Files"
Assert-Equal "comment after a spaced name" $spaceRows[0].comment "Shared folder"

# A print share and an empty listing.
$printRows = @(ConvertFrom-NetViewOutput -Lines @("HP LaserJet    Print    Office printer"))
Assert-Equal "print share type" $printRows[0].type "Print"
Assert-Equal "print share is not admin" $printRows[0].admin $false
Assert-Equal "empty listing yields no rows" (@(ConvertFrom-NetViewOutput -Lines @("There are no entries in the list.")).Count) 0
Assert-Equal "garbage yields no rows" (@(ConvertFrom-NetViewOutput -Lines @("System error 5 has occurred.", "Access is denied.")).Count) 0

# The parser must not invent `share` rows out of the title line.
Assert-Equal "title line is not a share" (@($rows | Where-Object { $_.name -eq "Shared resources at \\127.0.0.1" }).Count) 0

# --------------------------------------------------------- credential names

# The app has a username field and a domain field. Combining them blindly is how
# `CONTOSO\CONTOSO\alice` gets sent to a host.
$c = @(Get-UserCandidates -Username "alice" -Domain "CONTOSO")
Assert-Equal "domain field is applied" $c[0] "CONTOSO\alice"
Assert-Equal "bare account is kept as a fallback" $c[1] "alice"
Assert-Equal "two candidates for a plain account" $c.Count 2

$c = @(Get-UserCandidates -Username "CONTOSO\alice" -Domain "OTHER")
Assert-Equal "qualified username wins over the domain field" $c[0] "CONTOSO\alice"
Assert-Equal "qualified username is not doubled" $c.Count 1

$c = @(Get-UserCandidates -Username ".\alice" -Domain "")
Assert-Equal "the .\ prefix is stripped for DCOM" $c[0] "alice"
Assert-Equal "one candidate for a local account" $c.Count 1

$c = @(Get-UserCandidates -Username "alice@example.com" -Domain "WORKGROUP")
Assert-Equal "an e-mail address is tried as typed" $c[0] "alice@example.com"
Assert-Equal "an e-mail address is retried as a Microsoft account" $c[1] "MicrosoftAccount\alice@example.com"
Assert-Equal "the domain field is not bolted onto an e-mail address" $c.Count 2

$c = @(Get-UserCandidates -Username "  " -Domain "CONTOSO")
Assert-Equal "whitespace username yields no candidates" $c.Count 0
$c = @(Get-UserCandidates -Username "alice" -Domain "contoso\")
Assert-Equal "a trailing backslash on the domain is trimmed" $c[0] "contoso\alice"

# --------------------------------------------------------- host resolution

# Manual entries may be hostnames, and Browse sends whatever the user typed.
# This is the step that turns "nas01" into an IPv4 the port probe and DCOM can
# use; without it, browsing a saved hostname failed with "not a valid IPv4".
Assert-Equal "a literal IPv4 passes through" (Resolve-IPv4 -HostName "192.168.1.20") "192.168.1.20"
Assert-Equal "loopback passes through" (Resolve-IPv4 -HostName "127.0.0.1") "127.0.0.1"
Assert-Equal "surrounding whitespace is trimmed" (Resolve-IPv4 -HostName "  127.0.0.1  ") "127.0.0.1"
Assert-Equal "a UNC path is reduced to its host" (Resolve-IPv4 -HostName "\\127.0.0.1\share") "127.0.0.1"
Assert-Equal "a forward-slash path is reduced to its host" (Resolve-IPv4 -HostName "127.0.0.1/media") "127.0.0.1"
Assert-Equal "localhost resolves" (Resolve-IPv4 -HostName "localhost") "127.0.0.1"
Assert-Equal "an IPv6 literal is refused" (Resolve-IPv4 -HostName "::1") $null
Assert-Equal "an empty name is refused" (Resolve-IPv4 -HostName "") $null
Assert-Equal "a name that cannot resolve is refused" (Resolve-IPv4 -HostName "no-such-host.invalid") $null

# ------------------------------------------------------------ reason mapping

Assert-Equal "1326 is a bad password" (Get-NetUseReason -Code 1326) "bad_credentials"
Assert-Equal "86 is a bad password" (Get-NetUseReason -Code 86) "bad_credentials"
Assert-Equal "5 is access denied" (Get-NetUseReason -Code 5) "access_denied"
Assert-Equal "1219 is a session conflict" (Get-NetUseReason -Code 1219) "session_conflict"
Assert-Equal "1272 is blocked guest access" (Get-NetUseReason -Code 1272) "guest_blocked"
Assert-Equal "53 is unreachable" (Get-NetUseReason -Code 53) "unreachable"
Assert-Equal "0 is ok" (Get-NetUseReason -Code 0) "ok"
Assert-Equal "an unknown code is still a failure" (Get-NetUseReason -Code 4242) "failed"

$message = Get-NetMessage -Text ("System error 1326 has occurred.`r`nThe user name or password is incorrect.`r`n`r`nMore help is available by typing NET HELPMSG 1326.")
Assert-Equal "net.exe boilerplate is dropped" $message "System error 1326 has occurred. The user name or password is incorrect."
Assert-Equal "no message is no message" (Get-NetMessage -Text "") ""
# net.exe exits 2 for any failure; the actual code is only in the message.
Assert-Equal "the real code is read out of the text" (Get-NetErrorCode -ExitCode 2 -Text "System error 1326 has occurred.`r`nThe user name or password is incorrect.") 1326
Assert-Equal "the exit code is used when the text has no code" (Get-NetErrorCode -ExitCode 2 -Text "Access is denied.") 2
Assert-Equal "a zero exit code stays zero" (Get-NetErrorCode -ExitCode 0 -Text "") 0

Assert-Equal "plain argument is quoted" (Quote-NetArgument -Value "plain") '"plain"'
Assert-Equal "spaces survive quoting" (Quote-NetArgument -Value "pa ss") '"pa ss"'
Assert-Equal "a trailing backslash is escaped" (Quote-NetArgument -Value "pa\") '"pa\\"'
Assert-Equal "an embedded quote is escaped" (Quote-NetArgument -Value 'pa"ss') '"pa\"ss"'
Assert-Equal "an empty argument stays present" (Quote-NetArgument -Value "") '""'

$shape = New-ShareResult -Shares @() -Denied $true -Reason "bad_credentials" -Detail "nope"
Assert-True "a share result always carries all four fields" ($shape.ContainsKey("reason") -and $shape.ContainsKey("detail") -and $shape.ContainsKey("shares") -and $shape.ContainsKey("denied"))
Assert-Equal "an empty result still has a shares array" (@($shape.shares).Count) 0

# ------------------------------------------------------------------- live

if ($SkipLive) {
	Write-Host "skip live enumeration (requested)"
} else {
	Write-Host ("live: enumerating " + $Ip + " as the current user")
	$watch = [System.Diagnostics.Stopwatch]::StartNew()
	$result = Invoke-ShareEnumeration -IP $Ip -Username "" -Password "" -Domain ""
	$watch.Stop()
	$seconds = [math]::Round($watch.Elapsed.TotalSeconds, 1)

	Assert-Equal ("local enumeration is not denied (" + $seconds + "s)") $result.denied $false
	Assert-True ("local enumeration returns at least one share (" + $result.shares.Count + ")") ($result.shares.Count -gt 0)
	Assert-True "an administrative share is flagged" (@($result.shares | Where-Object { $_.admin }).Count -gt 0)
	# WS-Management answers instantly with an error; DCOM actually enumerates.
	# A 30s ceiling keeps the check honest without being flaky over loopback.
	Assert-True ("enumeration finished in under 30s (" + $seconds + "s)") ($seconds -lt 30)
}

# ------------------------------------------------- credentialed diagnostics

if ($Username) {
	$plain = ""
	if ($null -eq $Password) {
		$Password = Read-Host -AsSecureString ("Password for " + $Username + " on " + $Ip)
	}
	$bstr = [System.IntPtr]::Zero
	try {
		$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
		$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
	} finally {
		if ($bstr -ne [System.IntPtr]::Zero) { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
	}

	$candidates = @(Get-UserCandidates -Username $Username -Domain $Domain)
	Write-Host ""
	Write-Host ("credentials: " + $Username + " on " + $Ip)
	Write-Host ("  tried as : " + ($candidates -join "  then  "))
	Write-Host ("  password : " + $(if ($plain) { "supplied (" + $plain.Length + " chars)" } else { "EMPTY - net use is skipped" }))

	$unc = "\\" + $Ip + "\ipc$"
	$use = Invoke-NetCommand -Arguments @("use", $unc, ("/user:" + $candidates[0]), $plain)
	$useCode = Get-NetErrorCode -ExitCode $use.code -Text $use.text
	Write-Host ("  net use  : exit " + $use.code + ", code " + $useCode + " (" + (Get-NetUseReason -Code $useCode) + ") :: " + (Get-NetMessage -Text $use.text))
	$null = Invoke-NetCommand -Arguments @("use", $unc, "/delete", "/y") -TimeoutMs 15000

	$watch = [System.Diagnostics.Stopwatch]::StartNew()
	$result = Invoke-ShareEnumeration -IP $Ip -Username $Username -Password $plain -Domain $Domain
	$watch.Stop()
	$seconds = [math]::Round($watch.Elapsed.TotalSeconds, 1)

	Write-Host ("  helper   : denied=" + $result.denied + " reason=" + $result.reason + " shares=" + $result.shares.Count + " (" + $seconds + "s)")
	if ($result.detail) { Write-Host ("             " + $result.detail) }
	foreach ($s in $result.shares) {
		Write-Host ("             " + $s.name + " [" + $s.type + "] admin=" + $s.admin + " " + $s.comment)
	}

	if ($result.denied) {
		Write-Host "  verdict  : REFUSED - the helper could not see any shares with these credentials" -ForegroundColor Yellow
	} else {
		Write-Host "  verdict  : ACCEPTED" -ForegroundColor Green
	}

	if ($ExpectSuccess) {
		Assert-Equal ("credentials are accepted on " + $Ip) $result.denied $false
		Assert-True ("credentials return at least one share (" + $result.shares.Count + ")") ($result.shares.Count -gt 0)
	}
}

if ($script:failures -gt 0) {
	Write-Host ""
	Write-Host ("{0} FAILURE(S)" -f $script:failures)
	exit 1
}

Write-Host ""
Write-Host "all share-enumeration checks passed"
exit 0
