#!/bin/bash
# Ensure the script runs relative to its own directory so it can be executed
# from anywhere within the repository.
cd "$(dirname "$0")"
npx shadcn@latest init -d
