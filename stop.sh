#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.runtime"
PID_FILE="${RUNTIME_DIR}/vite.pid"

if [[ -f "${PID_FILE}" ]]; then
  SERVER_PID="$(cat "${PID_FILE}")"
  if ps -p "${SERVER_PID}" > /dev/null 2>&1; then
    kill "${SERVER_PID}"
    echo "已停止 PID: ${SERVER_PID}"
  fi
  rm -f "${PID_FILE}"
fi

PORT_PIDS="$(lsof -ti tcp:5176 || true)"
if [[ -n "${PORT_PIDS}" ]]; then
  echo "${PORT_PIDS}" | xargs kill
  echo "已清理 5176 端口占用"
  exit 0
fi

echo "未发现运行中的 SealMaking 服务"
