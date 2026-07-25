#!/bin/bash
cd "$(dirname "$0")"
export PATH="/Users/kelly/opt/anaconda3/envs/webdev/bin:$PATH"
exec /Users/kelly/opt/anaconda3/envs/webdev/bin/npm run dev
