#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=video-proof/git-branch-fallback.sh
source "${SCRIPT_DIR}/video-proof/git-branch-fallback.sh"

ARTIFACTS_DIR="${ARTIFACTS_DIR:-proof-artifacts}"
MAX_SCREENSHOTS=3

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "${name} is required" >&2
    exit 1
  fi
}

require_env GITHUB_REPOSITORY
require_env GITHUB_SERVER_URL
require_env GITHUB_RUN_ID
require_env PR_NUMBER

if [[ "$PR_NUMBER" == "null" || "$PR_NUMBER" == "" ]]; then
  echo "No PR number available, skipping comment"
  exit 0
fi

artifact_run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

STATUS_HEADER=$(
  cat <<EOF
## 🎬 Video Proof Test Results

**Branch**: \`${BRANCH_NAME:-unknown}\`
**Test Status**: ${VERDICT_EMOJI:-✅} ${VERDICT_TEXT:-Passed}
EOF
)

COMMENT_SECTIONS=()
COMMENT_SECTIONS+=("")
COMMENT_SECTIONS+=("Clicked **Ask Angie** to open the loadSidebarV2 sidebar on the product editor POC.")

screenshots_dir="${ARTIFACTS_DIR}/screenshots"
if [[ -d "$screenshots_dir" ]] && [[ -n "$(find "$screenshots_dir" -type f \( -name '*.png' -o -name '*.jpg' \) -print -quit)" ]]; then
  COMMENT_SECTIONS+=("")
  COMMENT_SECTIONS+=("### 📸 Screenshots")

  count=0
  while IFS= read -r -d '' file; do
    count=$((count + 1))
    relative="${file#"${screenshots_dir}"/}"
    safe_name=$(echo "$relative" | tr '/' '-')
    label="${safe_name%.*}"
    object_path=$(video_proof_git_object_path screenshots "$safe_name")

    if url=$(video_proof_upload_git_asset "$file" "$object_path"); then
      COMMENT_SECTIONS+=("")
      COMMENT_SECTIONS+=("**${label}**")
      COMMENT_SECTIONS+=("![${label}](${url})")
    else
      COMMENT_SECTIONS+=("")
      COMMENT_SECTIONS+=("- ${label} (upload failed — see [artifacts](${artifact_run_url}))")
    fi

    if [[ "$count" -ge "$MAX_SCREENSHOTS" ]]; then
      break
    fi
  done < <(find "$screenshots_dir" -type f \( -name '*.png' -o -name '*.jpg' \) -print0 | sort -z)
else
  COMMENT_SECTIONS+=("")
  COMMENT_SECTIONS+=("📸 Screenshots were not uploaded — see [workflow artifacts](${artifact_run_url}).")
fi

COMMENT_SECTIONS+=("")
COMMENT_SECTIONS+=("_Artifacts are also available on the [workflow run](${artifact_run_url})._")

COMMENT_BODY="${STATUS_HEADER}"$'\n'"$(printf '%s\n' "${COMMENT_SECTIONS[@]}")"

jq -n --arg body "$COMMENT_BODY" '{body: $body}' | gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" --input -
echo "Posted video proof comment on PR #${PR_NUMBER}"
