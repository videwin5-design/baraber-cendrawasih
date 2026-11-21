@echo off
title Cendrawasih Barbershop - Cloudflare Online Launcher
color 0A
cls
echo ==============================================================
echo       SISTEM MANAJEMEN BARBERSHOP CENDRAWASIH POS
echo              LAUNCHER ONLINE RESMI CLOUDFLARE
echo ==============================================================
echo.
echo [1/2] Menyalakan Server Produksi Lokal (Port 3000)...
start /b npx tsx server.ts
timeout /t 3 /nobreak > nul

echo [2/2] Menghubungkan ke Cloudflare Public Tunnel (Protokol HTTP2 Stabil)...
echo.
echo ==============================================================
echo   LINK ONLINE PUBLIK AKAN MUNCUL DI BAWAH INI (trycloudflare.com)
echo   Buka link tersebut di HP atau Laptop Anda.
echo   JANGAN TUTUP JENDELA INI SELAMA APLIKASI SEDANG DIGUNAKAN!
echo ==============================================================
echo.
C:\Users\lenovo\cloudflared.exe tunnel --protocol http2 --url http://127.0.0.1:3000
pause
