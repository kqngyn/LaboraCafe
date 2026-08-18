#!/bin/sh
# Point a form at its Formspree endpoint.
#   ./set-form-id.sh careers.html mabcdefg
#   ./set-form-id.sh events.html  mhijklmn
set -e
[ $# -eq 2 ] || { echo "usage: $0 <careers.html|events.html> <formspree-id>"; exit 1; }

# match the action attribute only — the setup comment above it also mentions
# YOUR_FORM_ID and a sample url, and neither should count as "configured"
current() { grep -o 'action="https://formspree.io/f/[A-Za-z0-9_]*"' "$1" | sed 's/.*f\///;s/"//'; }

[ "$(current "$1")" = "YOUR_FORM_ID" ] || {
  echo "$1 is already pointed at: $(current "$1")"; exit 1;
}
sed -i '' "s|action=\"https://formspree.io/f/YOUR_FORM_ID\"|action=\"https://formspree.io/f/$2\"|" "$1"
echo "$1 -> https://formspree.io/f/$(current "$1")"
