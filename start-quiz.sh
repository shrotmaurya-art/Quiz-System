#!/usr/bin/env sh

# Always work from this script's own folder, even when launched elsewhere.
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR" || exit 1

pause_after_failure() {
  printf '\n***************************************************************\n'
  printf '* THE SERVER STOPPED - TRY RUNNING THIS AGAIN.               *\n'
  printf '***************************************************************\n'
  printf 'Press Enter to close this window... '
  read -r _
}

if ! command -v npm >/dev/null 2>&1; then
  printf 'Node.js and npm are required but were not found.\n'
  printf 'Install the current Node.js LTS release, then run this file again.\n'
  pause_after_failure
  exit 1
fi

printf '\n================================================================\n'
printf '                     QUIZ SERVER LAUNCHER\n'
printf '================================================================\n\n'

if [ ! -d server/node_modules ]; then
  printf 'First-time setup: installing server dependencies...\n'
  npm --prefix server install || { pause_after_failure; exit 1; }
fi

if [ ! -d client/node_modules ]; then
  printf 'First-time setup: installing client dependencies...\n'
  npm --prefix client install || { pause_after_failure; exit 1; }
fi

if [ ! -f client/dist/index.html ]; then
  printf 'Preparing the quiz screens for the first run...\n'
  npm --prefix client run build || { pause_after_failure; exit 1; }
fi

printf '\nStarting the quiz server. The LAN address will appear in a large banner below.\n'
printf 'Keep this terminal open while the quiz is running.\n\n'

cd server || exit 1
npm run dev
SERVER_EXIT_CODE=$?
pause_after_failure
exit "$SERVER_EXIT_CODE"
