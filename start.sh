#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.runtime"
PID_FILE="${RUNTIME_DIR}/vite.pid"
LOG_FILE="${RUNTIME_DIR}/vite.log"

mkdir -p "${RUNTIME_DIR}"

if [[ -f "${PID_FILE}" ]]; then
  EXISTING_PID="$(cat "${PID_FILE}")"
  if ps -p "${EXISTING_PID}" > /dev/null 2>&1; then
    echo "SealMaking 已在运行，PID: ${EXISTING_PID}"
    echo "访问地址: http://localhost:5176"
    exit 0
  fi
  rm -f "${PID_FILE}"
fi

if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
  npm install --prefix "${ROOT_DIR}"
fi

nohup npm --prefix "${ROOT_DIR}" run dev > "${LOG_FILE}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"

echo "SealMaking 已启动，PID: ${SERVER_PID}"
echo "访问地址: http://localhost:5176"
echo "日志文件: ${LOG_FILE}"
