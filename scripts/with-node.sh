#!/usr/bin/env bash
set -euo pipefail
NODE_HOME="${NODE_HOME:-$HOME/.local/node-v20.18.1}"
export PATH="$NODE_HOME/bin:$PATH"
exec "$@"
