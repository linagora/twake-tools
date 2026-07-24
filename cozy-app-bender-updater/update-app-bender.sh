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

if [[ -z "$TOKEN" ]]; then
  echo "Error: no token provided."
  echo "Get your token from https://bender.cozycloud.cc/ -> Profile -> Personal API token"
  echo "Then run: export BENDER_TOKEN=\"<your-token>\" (or set HARDCODED_TOKEN in this script)"
  exit 1
fi

if [[ -z "$INSTANCE_LIST" || -z "$ENV" || -z "$REPO_NAME" || -z "$SLUG" ]]; then
  echo "Usage: $0 <instance>[,<instance>...] <env> <slug> <org/repo_name> [branch] [force]"
  echo "Example: $0 inst1.mycozy.cloud,inst2.mycozy.cloud prod home cozy/cozy-home build false"
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

IFS=',' read -ra INSTANCES <<< "$INSTANCE_LIST"
FAILED=()

for INSTANCE in "${INSTANCES[@]}"; do
  echo "--- Updating ${SLUG} on ${INSTANCE} ---"
  if ! curl -sS --fail-with-body -X PUT "https://bender.cozycloud.cc/instances/${ENV}/${INSTANCE}/apps/${SLUG}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "{\"force\":${FORCE},\"source\":\"${SOURCE}\"}"; then
    FAILED+=("$INSTANCE")
  fi
  echo
done

if ((${#FAILED[@]})); then
  echo "Failed instances: ${FAILED[*]}"
  exit 1
fi
