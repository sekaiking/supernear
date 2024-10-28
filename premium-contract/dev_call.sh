#!/bin/bash

METHOD=${1}
ARGS=${2}
ACCOUNT=${3-'royal-bomb.testnet'}

if [ "$#" -lt 2 ]; then
  echo "2 argument required, $# provided"
  echo "Example: dev_call.sh method_name '{}'"
  exit 1
fi

near contract call-function as-transaction "$ACCOUNT" "$METHOD" json-args "$ARGS" prepaid-gas '100.0 Tgas'
