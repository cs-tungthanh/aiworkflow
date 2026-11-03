#!/bin/sh
# Opens a separate Chrome profile with remote debugging on, so chatgpt-web-mcp can attach to it.
# Log in to ChatGPT in this window once; the profile keeps the session.
PROFILE="${CHATGPT_CHROME_PROFILE:-$HOME/.chatgpt-web-mcp/chrome-profile}"
PORT="${CHATGPT_CDP_PORT:-9222}"
mkdir -p "$PROFILE"
open -na "Google Chrome" --args \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  https://chatgpt.com/
