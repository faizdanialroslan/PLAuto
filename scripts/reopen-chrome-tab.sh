#!/bin/bash
# Closes any existing Chrome tab at $1, then opens it fresh - stops tabs piling up
# across repeated npm test runs. Chrome-specific, no-op if Chrome isn't running.
set -e
URL="$1"

if pgrep -x "Google Chrome" >/dev/null 2>&1; then
  osascript <<EOF
tell application "Google Chrome"
  repeat with w in windows
    set idxList to {}
    set tabList to tabs of w
    repeat with i from 1 to (count of tabList)
      if (URL of item i of tabList) contains "$URL" then
        set end of idxList to i
      end if
    end repeat
    repeat with i in (reverse of idxList)
      close tab i of w
    end repeat
  end repeat
end tell
EOF
fi

open "$URL"
