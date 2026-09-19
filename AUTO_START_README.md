# Nizam Bags POS - Automatic Startup

## Important: Docker vs Chrome
Docker can automatically restart the POS containers, but a Docker container cannot directly open Chrome on the host laptop. Therefore this project uses:
1. Docker Compose for the MySQL + backend + frontend services.
2. A small host startup script to wait for Docker, start the services, and open Chrome.

## Windows (your laptop)

### One-time setup
1. Make sure Docker Desktop is installed.
2. Open Docker Desktop -> Settings -> General.
3. Enable **Start Docker Desktop when you sign in to Windows**.
4. Test once:
   - Double-click `scripts/start-nizam-pos-windows.bat`
   - It should start the containers and open `http://localhost` in Chrome.

### Make it automatic at Windows login
1. Press `Win + R`.
2. Type `shell:startup` and press Enter.
3. Create a shortcut in that folder to:
   `scripts/start-nizam-pos-windows.bat`
4. Restart Windows and test.

This runs after you sign in. Docker Desktop starts first, the script waits for Docker, then starts the POS and opens Chrome.

## Linux (your friend's laptop)

Run once from the project folder:
```bash
chmod +x scripts/start-nizam-pos-linux.sh
```

For automatic login startup, add the script to the desktop environment's Startup Applications, or create a systemd user service that runs:
```bash
scripts/start-nizam-pos-linux.sh
```

## Manual Docker commands

Start:
```bash
docker compose up -d --build
```

Stop:
```bash
docker compose down
```

See running containers:
```bash
docker compose ps
```

Open:
`http://localhost`

## Receipt changes
- `Nizam Bag Works` is centered.
- Receipt heading is set to **36px**.
- The existing `DSArabic` font from `frontend/public/fonts/arab3end.ttf` is retained.
- The receipt remains formatted for an 80mm thermal-printer layout.
