#!/bin/bash

VIDEO_PROOF_ASSETS_BRANCH="ci/video-proof-assets"

video_proof_git_object_path() {
  local category="$1"
  local relative_path="$2"
  local safe_name
  safe_name=$(echo "$relative_path" | tr '/' '-')
  echo "ci/video-proof/pr-${PR_NUMBER}/run-${GITHUB_RUN_ID}/${category}/${safe_name}"
}

video_proof_git_asset_url() {
  local repo_path="$1"
  echo "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/raw/${VIDEO_PROOF_ASSETS_BRANCH}/${repo_path}"
}

video_proof_git_available() {
  command -v gh &>/dev/null && [[ -n "${GH_TOKEN:-}" ]]
}

video_proof_ensure_assets_branch() {
  if gh api "repos/${GITHUB_REPOSITORY}/git/ref/heads/${VIDEO_PROOF_ASSETS_BRANCH}" &>/dev/null; then
    return 0
  fi

  local default_branch base_sha
  default_branch=$(gh api "repos/${GITHUB_REPOSITORY}" --jq .default_branch) || return 1
  base_sha=$(gh api "repos/${GITHUB_REPOSITORY}/git/ref/heads/${default_branch}" --jq .object.sha) || return 1
  gh api "repos/${GITHUB_REPOSITORY}/git/refs" \
    -f ref="refs/heads/${VIDEO_PROOF_ASSETS_BRANCH}" \
    -f sha="${base_sha}" >/dev/null || return 1
}

video_proof_upload_git_asset() {
  local local_path="$1"
  local repo_path="$2"
  local b64_file payload_file

  if ! video_proof_ensure_assets_branch; then
    echo "Failed to ensure assets branch ${VIDEO_PROOF_ASSETS_BRANCH}" >&2
    return 1
  fi

  b64_file=$(mktemp)
  payload_file=$(mktemp)

  base64 -w 0 "$local_path" >"$b64_file"
  jq -n \
    --arg message "Add video proof asset (PR #${PR_NUMBER}, run ${GITHUB_RUN_ID})" \
    --arg branch "${VIDEO_PROOF_ASSETS_BRANCH}" \
    --rawfile content "$b64_file" \
    '{message: $message, content: $content, branch: $branch}' >"$payload_file"

  gh api "repos/${GITHUB_REPOSITORY}/contents/${repo_path}" -X PUT --input "$payload_file" >/dev/null
  rm -f "$b64_file" "$payload_file"
  video_proof_git_asset_url "$repo_path"
}
