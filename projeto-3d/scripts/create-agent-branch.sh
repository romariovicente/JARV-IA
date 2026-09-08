#!/bin/bash
FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "Uso: ./scripts/create-agent-branch.sh <nome-da-feature>"
  echo "Exemplo: ./scripts/create-agent-branch.sh fix-ui"
  exit 1
fi

BRANCH="jarv-${FEATURE_NAME}"
git checkout main
git pull origin main 2>/dev/null || true
git checkout -b "$BRANCH"
echo "✅ Branch segura criada e ativada: $BRANCH"
