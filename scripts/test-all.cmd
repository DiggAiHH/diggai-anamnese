@echo off
REM Plausibilitäts-Test ALLER API-Endpoints und Frontend-Routes.
REM Output: D:\Temp\fly-all-test.log
setlocal
if not exist "D:\Temp" mkdir "D:\Temp"
echo [Start %date% %time%] > "D:\Temp\fly-all-test.log"

set H=-H "x-tenant-id: klaproth"
set BASE=https://diggai-api.fly.dev/api

call :test "1. Health (no auth)"   "%BASE%/health"
call :test "2. CSRF-Token (no auth)"   "%BASE%/csrf-token"
call :test "3. Tenants by-bsnr (public)"   "%BASE%/tenants/by-bsnr/999999999"
call :test "4. Atoms (auth required for tenant ops)"   "%BASE%/atoms"
call :test "5. Sessions (POST auth)"   "%BASE%/sessions"
call :test "6. Sessions/test/state"   "%BASE%/sessions/test/state"
call :test "7. Sessions/test/export/gdt"   "%BASE%/sessions/test/export/gdt"
call :test "8. Queue position"   "%BASE%/queue/position/test-id"
call :test "9. Queue flow-config"   "%BASE%/queue/flow-config/test-id"
call :test "10. Arzt me"   "%BASE%/arzt/me"
call :test "11. MFA dashboard"   "%BASE%/mfa"
call :test "12. MFA reception"   "%BASE%/mfa/reception"
call :test "13. Admin"   "%BASE%/admin"
call :test "14. Patients"   "%BASE%/patients"
call :test "15. Therapy"   "%BASE%/therapy"
call :test "16. PWA"   "%BASE%/pwa"
call :test "17. Wunschbox"   "%BASE%/wunschbox"
call :test "18. PVS"   "%BASE%/pvs"
call :test "19. NFC"   "%BASE%/nfc"
call :test "20. Flows"   "%BASE%/flows"
call :test "21. Forms"   "%BASE%/forms"
call :test "22. EPA"   "%BASE%/epa"
call :test "23. Telemedizin"   "%BASE%/telemedizin"
call :test "24. Avatar"   "%BASE%/avatar"
call :test "25. Voice"   "%BASE%/voice"
call :test "26. Agents"   "%BASE%/agents"
call :test "27. Subscriptions"   "%BASE%/subscriptions"
call :test "28. Billing"   "%BASE%/billing"
call :test "29. Theme"   "%BASE%/theme"
call :test "30. Wearables"   "%BASE%/wearables"
call :test "31. Praxis-Chat"   "%BASE%/praxis-chat"
call :test "32. Gamification"   "%BASE%/gamification"
call :test "33. Episodes"   "%BASE%/episodes"
call :test "34. Signatures"   "%BASE%/signatures"
call :test "35. Feedback"   "%BASE%/feedback"
call :test "36. Content"   "%BASE%/content"
call :test "37. ROI"   "%BASE%/roi"
call :test "38. AI"   "%BASE%/ai"
call :test "39. Auth"   "%BASE%/auth"
call :test "40. TI"   "%BASE%/ti"
call :test "41. System"   "%BASE%/system"
call :test "42. Tomedo-Bridge (entfernt → 404)"   "%BASE%/tomedo-bridge"
call :test "43. Tomedo-Batch (entfernt → 404)"   "%BASE%/tomedo-batch"
call :test "44. FHIR-Webhook"   "%BASE%/fhir-webhook"
call :test "45. Todos"   "%BASE%/todos"
call :test "46. Chats"   "%BASE%/chats"

echo. >> "D:\Temp\fly-all-test.log"
echo === FRONTEND-Routes (Netlify SPA) === >> "D:\Temp\fly-all-test.log"
call :testfe "F1. Root"   "https://diggai.de/"
call :testfe "F2. Anamnese"   "https://diggai.de/anamnese"
call :testfe "F3. Patient"   "https://diggai.de/patient"
call :testfe "F4. PWA-Login"   "https://diggai.de/pwa/login"
call :testfe "F5. Verwaltungs-Login"   "https://diggai.de/verwaltung/login"
call :testfe "F6. Verwaltung Arzt"   "https://diggai.de/verwaltung/arzt"
call :testfe "F7. Verwaltung MFA"   "https://diggai.de/verwaltung/mfa"
call :testfe "F8. Verwaltung Admin"   "https://diggai.de/verwaltung/admin"
call :testfe "F9. Datenschutz"   "https://diggai.de/datenschutz"
call :testfe "F10. Impressum"   "https://diggai.de/impressum"
call :testfe "F11. Hatami"   "https://diggai.de/hatami/"

echo. >> "D:\Temp\fly-all-test.log"
echo [End %date% %time%] >> "D:\Temp\fly-all-test.log"
goto :eof

:test
echo. >> "D:\Temp\fly-all-test.log"
echo === %~1 === >> "D:\Temp\fly-all-test.log"
curl -sS -o nul -w "HTTP %%{http_code}  ContentType=%%{content_type}  Size=%%{size_download}b" -H "x-tenant-id: klaproth" %~2 >> "D:\Temp\fly-all-test.log" 2>&1
echo. >> "D:\Temp\fly-all-test.log"
goto :eof

:testfe
echo. >> "D:\Temp\fly-all-test.log"
echo === %~1 === >> "D:\Temp\fly-all-test.log"
curl -sS -o nul -w "HTTP %%{http_code}  ContentType=%%{content_type}  Size=%%{size_download}b" %~2 >> "D:\Temp\fly-all-test.log" 2>&1
echo. >> "D:\Temp\fly-all-test.log"
goto :eof
