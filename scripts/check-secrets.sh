#!/usr/bin/env sh
# Blocks commits that stage local env files or Anthropic API keys.
set -e
staged=$(git diff --cached --name-only --diff-filter=ACMR)
bad_files=$(printf '%s\n' "$staged" | grep -E '(^|/)\.env(\..*)?$' | grep -v -E '(^|/)\.env\.example$' || true)
if [ -n "$bad_files" ]; then
  echo "ERROR: refusing to commit local env file(s):"
  printf '  %s\n' $bad_files
  echo "Unstage with: git restore --staged <file>"
  exit 1
fi
if [ -n "$staged" ] && git diff --cached -U0 -- $staged | grep -E '^\+.*sk-ant-[A-Za-z0-9_-]{8,}' | grep -v 'REPLACE_ME' >/dev/null; then
  echo "ERROR: staged changes contain what looks like an Anthropic API key (sk-ant-...)."
  echo "Remove the key and keep it only in .env.local or a Salesforce Named Credential."
  exit 1
fi
