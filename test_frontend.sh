#!/bin/bash
cd apps/web
timeout 10 pnpm dev 2>&1 &
SERVER_PID=$!
sleep 5
curl http://127.0.0.1:3000 2>/dev/null | head -20
kill $SERVER_PID 2>/dev/null || true
