--------------------------------------------------
-- DiggAi  ·  tomedo → PraktIQ Bridge (gehärtet)
-- v2.0 · DSGVO-konform · 2026-05-04
--
-- Änderungen gg. v1:
-- 1. Bundle-Pfad: Markdown-Bug entfernt
-- 2. PII NICHT mehr in CLI-Args, sondern komplett in einer JSON-Datei
-- 3. mktemp statt fixem /tmp/praktiq-akte.txt (nicht ratbar)
-- 4. chmod 600 sofort nach dem Schreiben
-- 5. Handshake-Datei statt blindem `delay 5` → App löscht selbst nach Lesen
-- 6. Audit-Log nach ~/Library/Logs/diggai-tomedo.log
-- 7. try/on error um alle externen Calls
--
-- HINWEIS: Regex-Block sowie d1–d4 (AA2A) und e1–e4 (JJNN) NICHT ändern,
--          PraktIQ ist auf den Syntax angewiesen.
--------------------------------------------------

-- ============================================================
-- EXPORTQUELLEN  (Syntax UNVERÄNDERT — PraktIQ-Anforderung)
-- ============================================================
set akte to quoted form of "$[regex \s*([a-zA-Z0-9äöüß\s.:!?,\-μ°@§€$%=/]+) x ... _ _ _ NN AA2A JJNN _ U _ -anzahlTreffer inf -trennsequenz <leer> | tr \"-\" \" \"]$"
set selected to quoted form of "$[regex \s*([a-zA-Z0-9äöüß\s.:!?,\-μ°@§€$%=/]+) x ... _ sel _ NN AA2A JJNN _ U _ -anzahlTreffer inf -trennsequenz <leer> | tr \"-\" \" \"]$"

-- ============================================================
-- PATIENTENDATEN
-- ============================================================
set lastName to quoted form of "$[patient_name]$"
set firstName to quoted form of "$[patient_vorname]$"
set birthDate to quoted form of "$[pg]$"
set gender to quoted form of "$[patient_geschlecht]$"
set ageFormatted to quoted form of "$[palter_formatiert]$"
set specialtyGroup to quoted form of "$[besuchHauptbehandler_fachgruppen]$"
set userInitials to quoted form of "$[nutzerkuerzel]$"
set bsnr to quoted form of "$[bsnr]$"
set lanr to quoted form of "$[lanr]$"
set email to quoted form of "$[pemail]$"
set telefon to quoted form of "$[ptel]$"
set handy to quoted form of "$[phandy]$"
set versichertennummer to quoted form of "$[pversnr]$"
set adresse to quoted form of "$[patient_strasse]$"
set plz to quoted form of "$[patient_plz]$"
set wohnort to quoted form of "$[patient_ort]$"
set pId to quoted form of "$[pid]$"

-- ============================================================
-- KONFIGURATION
-- ============================================================
set appBundlePath to "/Applications/PraktIQ Test.app"
set appName to "PraktIQ Test"
set logPath to (POSIX path of (path to library folder from user domain)) & "Logs/diggai-tomedo.log"

-- ============================================================
-- AUSWAHLDIALOG  (Default = Gesamte Akte)
-- ============================================================
set dialogResult to display dialog ¬
	"DSGVO-konforme Datenanalyse für folgende Patientendaten:" & return & return & ¬
	firstName & " " & lastName & return & ¬
	"Geburtsdatum: " & birthDate & return & return & ¬
	"Welche Daten sollen übernommen werden?" buttons {"Abbrechen", "Nur Auswahl", "Gesamte Akte"} default button "Gesamte Akte"
set pressedButton to button returned of dialogResult
if pressedButton is "Abbrechen" then return

-- ============================================================
-- AUSWAHL PRÜFEN
-- ============================================================
set cleanSelected to selected as text
set placeholders to {"Untitled document", "Untitled Document", "Untitled", "unbenannt", "leer", "missing value"}
repeat with ph in placeholders
	if cleanSelected contains (ph as text) then set cleanSelected to ""
end repeat

if pressedButton is "Nur Auswahl" then
	if cleanSelected is "" then
		set exportAkte to akte
		set exportSelection to ""
	else
		set exportAkte to cleanSelected
		set exportSelection to cleanSelected
	end if
else
	set exportAkte to akte
	set exportSelection to ""
end if

-- ============================================================
-- TEMP-DATEI mit mktemp (eindeutig, nicht ratbar)
-- ============================================================
try
	set jsonPath to do shell script "/usr/bin/mktemp /tmp/diggai-tomedo.XXXXXX.json"
	set handshakePath to jsonPath & ".done"
on error errMsg
	display dialog "Fehler beim Erstellen der Temp-Datei: " & errMsg buttons {"OK"} default button "OK"
	return
end try

-- ============================================================
-- JSON-PAYLOAD bauen (PII raus aus CLI-Args)
-- AppleScript-eigenes Escaping für JSON-Strings
-- ============================================================
on jsonEscape(str)
	set str to str as text
	set AppleScript's text item delimiters to "\\"
	set parts to text items of str
	set AppleScript's text item delimiters to "\\\\"
	set str to parts as text
	set AppleScript's text item delimiters to "\""
	set parts to text items of str
	set AppleScript's text item delimiters to "\\\""
	set str to parts as text
	set AppleScript's text item delimiters to (ASCII character 10)
	set parts to text items of str
	set AppleScript's text item delimiters to "\\n"
	set str to parts as text
	set AppleScript's text item delimiters to ""
	return str
end jsonEscape

on unquote(qstr)
	set qstr to qstr as text
	if qstr starts with "'" and qstr ends with "'" then
		return text 2 thru -2 of qstr
	end if
	return qstr
end unquote

set jsonPayload to "{" & ¬
	"\"schemaVersion\":\"2.0\"," & ¬
	"\"source\":\"tomedo-praktiq-bridge\"," & ¬
	"\"timestamp\":\"" & (do shell script "/bin/date -u +%FT%TZ") & "\"," & ¬
	"\"mode\":\"" & pressedButton & "\"," & ¬
	"\"patient\":{" & ¬
	"\"id\":\"" & jsonEscape(unquote(pId)) & "\"," & ¬
	"\"lastName\":\"" & jsonEscape(unquote(lastName)) & "\"," & ¬
	"\"firstName\":\"" & jsonEscape(unquote(firstName)) & "\"," & ¬
	"\"birthDate\":\"" & jsonEscape(unquote(birthDate)) & "\"," & ¬
	"\"gender\":\"" & jsonEscape(unquote(gender)) & "\"," & ¬
	"\"age\":\"" & jsonEscape(unquote(ageFormatted)) & "\"," & ¬
	"\"email\":\"" & jsonEscape(unquote(email)) & "\"," & ¬
	"\"phone\":\"" & jsonEscape(unquote(telefon)) & "\"," & ¬
	"\"mobile\":\"" & jsonEscape(unquote(handy)) & "\"," & ¬
	"\"insuranceNumber\":\"" & jsonEscape(unquote(versichertennummer)) & "\"," & ¬
	"\"address\":{" & ¬
	"\"street\":\"" & jsonEscape(unquote(adresse)) & "\"," & ¬
	"\"zip\":\"" & jsonEscape(unquote(plz)) & "\"," & ¬
	"\"city\":\"" & jsonEscape(unquote(wohnort)) & "\"" & ¬
	"}}," & ¬
	"\"practice\":{" & ¬
	"\"bsnr\":\"" & jsonEscape(unquote(bsnr)) & "\"," & ¬
	"\"lanr\":\"" & jsonEscape(unquote(lanr)) & "\"," & ¬
	"\"specialty\":\"" & jsonEscape(unquote(specialtyGroup)) & "\"," & ¬
	"\"userInitials\":\"" & jsonEscape(unquote(userInitials)) & "\"" & ¬
	"}," & ¬
	"\"akte\":\"" & jsonEscape(unquote(exportAkte)) & "\"," & ¬
	"\"selection\":\"" & jsonEscape(unquote(exportSelection)) & "\"," & ¬
	"\"handshakePath\":\"" & handshakePath & "\"" & ¬
	"}"

-- ============================================================
-- JSON schreiben + chmod 600
-- ============================================================
try
	set fh to open for access POSIX file jsonPath with write permission
	set eof fh to 0
	write jsonPayload to fh as «class utf8»
	close access fh
	do shell script "/bin/chmod 600 " & quoted form of jsonPath
on error errMsg
	try
		close access POSIX file jsonPath
	end try
	display dialog "Fehler beim Schreiben der Daten: " & errMsg buttons {"OK"} default button "OK"
	return
end try

-- ============================================================
-- AUDIT-LOG (kein Klartextname → nur pId)
-- ============================================================
try
	set logLine to (do shell script "/bin/date -u +%FT%TZ") & " | export | mode=" & pressedButton & ¬
		" | pid=" & unquote(pId) & ¬
		" | path=" & jsonPath
	do shell script "/bin/mkdir -p " & quoted form of (POSIX path of (path to library folder from user domain)) & "Logs && /bin/echo " & quoted form of logLine & " >> " & quoted form of logPath
end try

-- ============================================================
-- APP STARTEN  (NUR Pfad als Argument, keine PII mehr)
-- ============================================================
set appRunning to false
try
	do shell script "/usr/bin/pgrep -qx " & quoted form of appName
	set appRunning to true
on error
	set appRunning to false
end try

set openCmd to "/usr/bin/open "
if appRunning then
	set openCmd to openCmd & "-na "
else
	set openCmd to openCmd & "-a "
end if
set openCmd to openCmd & quoted form of appBundlePath & ¬
	" --args --diggai-payload=" & quoted form of jsonPath

try
	do shell script openCmd
on error errMsg
	display dialog "Fehler beim Starten von PraktIQ: " & errMsg buttons {"OK"} default button "OK"
	do shell script "/bin/rm -f " & quoted form of jsonPath
	return
end try

-- ============================================================
-- VORDERGRUND
-- ============================================================
delay 0.3
try
	do shell script "/usr/bin/open -a " & quoted form of appBundlePath
end try

-- ============================================================
-- HANDSHAKE-POLLING statt fixem delay 5
-- ============================================================
set maxWaitSec to 30
set waited to 0
set handshakeOk to false
repeat while waited < maxWaitSec
	try
		do shell script "/usr/bin/test -f " & quoted form of handshakePath
		set handshakeOk to true
		exit repeat
	end try
	delay 0.5
	set waited to waited + 0.5
end repeat

-- ============================================================
-- TEMP-DATEIEN LÖSCHEN
-- ============================================================
try
	do shell script "/bin/rm -f " & quoted form of jsonPath & " " & quoted form of handshakePath
end try

if not handshakeOk then
	try
		do shell script "/bin/echo " & quoted form of ((do shell script "/bin/date -u +%FT%TZ") & " | WARN | no handshake within " & maxWaitSec & "s | pid=" & unquote(pId)) & " >> " & quoted form of logPath
	end try
end if
