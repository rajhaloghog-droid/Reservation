@echo off
setlocal

echo Adding Windows Firewall rule for TCP 4001 on Private networks only...
C:\Windows\System32\netsh.exe advfirewall firewall add rule name="Reservation LAN 4001" dir=in action=allow protocol=TCP localport=4001 profile=private

echo.
echo If the rule was added successfully, your app can be reached from other PCs on the same local network.
pause
