@echo off
echo Stopping Docker services (if running)...
sc stop com.docker.service 2>nul || echo service not running
sc delete com.docker.service 2>nul || echo could not delete service or not present

echo Removing Program Files Docker...
rmdir /s /q "C:\Program Files\Docker"

echo Removing ProgramData DockerDesktop...
rmdir /s /q "C:\ProgramData\DockerDesktop"

echo Removing user AppData Docker...
rmdir /s /q "%USERPROFILE%\AppData\Local\Docker"
rmdir /s /q "%USERPROFILE%\AppData\Roaming\Docker"
rmdir /s /q "%USERPROFILE%\\.docker"

echo Removal script finished.
pause
