# Load Desk Daily Shift Notes

A simple shared web app based on the supplied Load Desk form. It creates one standardized daily record, timestamps every entry, applies shift styling automatically, keeps an archive, and exports any day to PDF.

## Included

- One daily notes record using Central Time (`America/Chicago`)
- Logical document name: `DAILY LOAD NOTES MM/DD/YY`
- Automatic archive snapshot at 11:50 PM Central
- Automatic 1st Shift styling before 3:30 PM and 2nd Shift styling at/after 3:30 PM
- Edit, highlight/unhighlight, and delete controls
- Notes up to 2,000 characters each
- Header assignments for Load Desk and supporting WOLs
- Archived-day viewer and per-day PDF export
- Persistent JSON storage suitable for a small internal team
- Responsive phone, tablet, and desktop layout

The `/` characters in the logical document name are shown inside the app. Downloaded files use hyphens (`DAILY LOAD NOTES MM-DD-YY.pdf`) because `/` is not valid inside a filename.

## Quick start with Docker

```bash
docker compose up -d --build
```

Open `http://SERVER-IP:8082`. Data persists in the local `data` folder. The container automatically restarts after a reboot.

## Quick start with Node.js

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Open `http://localhost:8082`.

Windows users can double-click `start.bat`. Linux users can run `chmod +x start.sh && ./start.sh`.

## Backup

Back up the entire `data` directory. `data/notes-db.json` is the live database and `data/archives` contains daily archive snapshots.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8082` | Web server port |
| `DATA_DIR` | `./data` | Persistent data directory |

All date, shift, and archive calculations are explicitly performed in `America/Chicago`, regardless of the server's operating-system timezone.
# LOXnotes
