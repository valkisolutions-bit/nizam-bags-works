# Nizam Bags POS - Client Machine Update Guide

This package contains the lightweight deployment and updater files for **Nizam Bags POS**.

---

## ⚡ How to Update the POS on Windows 10

1. **Double-click** `update-nizam-pos.bat` (or Right-Click -> **Run as administrator**).
2. The script will:
   - Verify that Docker Desktop is running (starts it automatically if needed).
   - Download the newest Docker images from Docker Hub (`valkisolutions/nizam-frontend` and `valkisolutions/nizam-backend`).
   - Stop and remove the old frontend and backend containers.
   - **Keep your MySQL database and historical sales records safe and untouched!**
   - Start the updated POS containers.
   - Ensure the Windows startup shortcut in `shell:startup` is configured.
   - Wait for the website to be ready and automatically launch Google Chrome to `http://localhost`.

---

## 🔄 Daily Automatic Startup on Windows Boot

You don't need to do anything manually every day!
1. When you power on the computer and log into Windows 10, Docker Desktop starts in the background.
2. Windows Startup automatically launches `scripts\start-nizam-pos-windows.bat`.
3. The script waits for Docker to finish booting up, starts the POS containers, and opens Google Chrome to `http://localhost`.

---

## 🛡️ Database & Data Safety Note
- Your store sales, inventory, and order records are stored inside a dedicated Docker volume (`nizam-bags-works_db_data`).
- Updating frontend and backend **NEVER** touches or deletes your database.
- Even when the computer is turned off or restarted, all data persists safely.
