#!/bin/bash

ACCOUNT=${1-'premium.super_near.near'}
OWNER=${2-'super_near.near'}

cargo near deploy --no-locked --no-docker "$ACCOUNT"
