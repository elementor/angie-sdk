#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "agent" ]]; then
  shift
fi

args=()
for arg in "$@"; do
  if [[ "$arg" == "--print" ]]; then
    args+=("-p")
  else
    args+=("$arg")
  fi
done

exec agent --trust "${args[@]}"
