#!/bin/bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
cd /Users/bari/Documents/GitHub/Quicky/apps/mobile
EXPO_ROUTER_APP_ROOT=app npx expo start --web --port 8081
