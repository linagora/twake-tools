#!/bin/bash

# Bender personal API token, available from https://bender.cozycloud.cc/
# -> Profile -> "Personal API token".
# Either hardcode it below, or pass it via the BENDER_TOKEN environment
# variable (which takes precedence): export BENDER_TOKEN="xxxx"
HARDCODED_TOKEN=""
TOKEN="${BENDER_TOKEN:-$HARDCODED_TOKEN}"
INSTANCE_LIST=$1
ENV=$2
SLUG=$3
REPO_NAME=$4
BRANCH=${5:-"build"}
FORCE=${6:-"true"}

# Set BENDER_VERBOSE=1 to also print the raw API response of each call.
VERBOSE="${BENDER_VERBOSE:-0}"

if [[ -t 1 ]]; then
  BOLD=$'\e[1m'; DIM=$'\e[2m'; GREEN=$'\e[32m'; RED=$'\e[31m'; RESET=$'\e[0m'
else
  BOLD=""; DIM=""; GREEN=""; RED=""; RESET=""
fi

if [[ -z "$TOKEN" ]]; then
  echo "Error: no token provided."
  echo "Get your token from https://bender.cozycloud.cc/ -> Profile -> Personal API token"
  echo "Then run: export BENDER_TOKEN=\"<your-token>\" (or set HARDCODED_TOKEN in this script)"
  exit 1
fi

if [[ -z "$INSTANCE_LIST" || -z "$ENV" || -z "$REPO_NAME" || -z "$SLUG" ]]; then
  # Set by the npx/global wrapper, so the usage message shows how the script
  # was actually invoked rather than its cached path.
  NAME="${BENDER_USAGE_NAME:-$0}"
  echo "Usage: $NAME <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]"
  echo "Example: $NAME inst1.mycozy.cloud,inst2.mycozy.cloud prod home cozy/cozy-home build false"
  exit 1
fi

if [[ "$REPO_NAME" != */* ]]; then
  echo "Error: repo_name must include the organization, e.g. \"cozy/cozy-home\" or \"linagora/twake-drive\" (got \"$REPO_NAME\")"
  exit 1
fi

if [[ "$FORCE" != "true" && "$FORCE" != "false" ]]; then
  echo "Error: force must be \"true\" or \"false\" (got \"$FORCE\")"
  exit 1
fi

SOURCE="git://github.com/${REPO_NAME}.git#${BRANCH}"

# Extracts a human-readable field from the JSON response. Falls back to an
# empty string when jq is unavailable or the field is missing.
json_field() {
  local body=$1 filter=$2
  command -v jq >/dev/null 2>&1 || return 0
  printf '%s' "$body" | jq -r "${filter} // empty" 2>/dev/null
}

# Builds the one-line reason of a failure, from the API error message when
# there is one, or from a short summary of the raw body as a last resort.
error_message() {
  local body=$1 msg
  msg=$(json_field "$body" '.error // .errors[0].detail // .errors[0].title // .message')
  if [[ -z "$msg" ]]; then
    if [[ -z "${body// /}" ]]; then
      msg="no response body"
    elif [[ "${body:0:1}" == "<" ]]; then
      msg="unexpected HTML response (run again with BENDER_VERBOSE=1 to see it)"
    else
      msg=$(printf '%s' "$body" | tr -d '\n' | cut -c1-160)
    fi
  fi
  printf '%s' "$msg"
}

IFS=',' read -ra INSTANCES <<< "$INSTANCE_LIST"
FAILED=()

echo "${BOLD}Updating ${SLUG}${RESET} from ${SOURCE} ${DIM}(env: ${ENV}, force: ${FORCE})${RESET}"
echo

for INSTANCE in "${INSTANCES[@]}"; do
  BODY_FILE=$(mktemp)
  STATUS=$(curl -sS -o "$BODY_FILE" -w '%{http_code}' \
    -X PUT "https://bender.cozycloud.cc/instances/${ENV}/${INSTANCE}/apps/${SLUG}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "{\"force\":${FORCE},\"source\":\"${SOURCE}\"}" 2>/dev/null)
  BODY=$(cat "$BODY_FILE")
  rm -f "$BODY_FILE"

  if [[ "$STATUS" =~ ^2[0-9][0-9]$ ]]; then
    VERSION=$(json_field "$BODY" '.data.attributes.version')
    STATE=$(json_field "$BODY" '.data.attributes.state')
    DETAILS=""
    [[ -n "$VERSION" ]] && DETAILS="version ${VERSION}"
    [[ -n "$STATE" ]] && DETAILS="${DETAILS:+${DETAILS}, }state ${STATE}"
    echo "${GREEN}✔${RESET} ${INSTANCE}: updated${DETAILS:+ ${DIM}(${DETAILS})${RESET}}"
  else
    FAILED+=("$INSTANCE")
    if [[ "$STATUS" == "000" ]]; then
      echo "${RED}✘${RESET} ${INSTANCE}: request failed (could not reach Bender)"
    elif [[ "$STATUS" == "401" || "$STATUS" == "403" || "$STATUS" =~ ^3[0-9][0-9]$ ]]; then
      echo "${RED}✘${RESET} ${INSTANCE}: authentication failed (HTTP ${STATUS}) - check your Bender token"
    else
      echo "${RED}✘${RESET} ${INSTANCE}: failed (HTTP ${STATUS}) - $(error_message "$BODY")"
    fi
  fi

  if [[ "$VERBOSE" == "1" ]]; then
    echo "${DIM}${BODY}${RESET}"
  fi
done

echo
TOTAL=${#INSTANCES[@]}
SUCCEEDED=$((TOTAL - ${#FAILED[@]}))

if ((${#FAILED[@]})); then
  echo "${RED}${BOLD}${SUCCEEDED}/${TOTAL} instance(s) updated${RESET} - failed: ${FAILED[*]}"
  exit 1
fi

echo "${GREEN}${BOLD}${SUCCEEDED}/${TOTAL} instance(s) updated${RESET}"
