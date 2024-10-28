#!/bin/bash

ACCOUNT=${1-'royal-bomb.testnet'}
OWNER=${2-'royal-bomb.testnet'}

cargo near deploy --no-locked --no-docker "$ACCOUNT" without-init-call network-config testnet sign-with-keychain send
