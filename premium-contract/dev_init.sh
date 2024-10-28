#!/bin/bash

ACCOUNT=${1-'royal-bomb.testnet'}
OWNER=${2-'royal-bomb.testnet'}

ARGS='{"owner_id": "'$OWNER'", "referral_fee": { "numerator": 1, "denominator": 20 }, "premium_referral_fee": { "numerator": 1, "denominator": 10 } }'

near contract call-function as-transaction "$ACCOUNT" new json-args "$ARGS" prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as "$ACCOUNT" network-config testnet sign-with-keychain
