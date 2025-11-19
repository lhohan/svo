# Image Processor WASM - Task Runner
# Run 'just --list' to see all available commands

set dotenv-load

# Run the development server
run:
    simple-http-server www -p 8000 -i

# Build WASM in development mode (faster iteration)
build:
    #!/bin/bash
    set -e
    VERSION=$(grep '^version' Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
    COMMIT_HASH=$(git rev-parse --short HEAD)
    wasm-pack build --target web
    cp -r pkg www/
    {
        echo "export const VERSION = '${VERSION}';"
        echo "export const COMMIT_HASH = '${COMMIT_HASH}';"
    } > www/version.js

# Build WASM in release mode (optimized for production)
build-release:
    #!/bin/bash
    set -e
    VERSION=$(grep '^version' Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
    COMMIT_HASH=$(git rev-parse --short HEAD)
    wasm-pack build --target web --release
    cp -r pkg www/
    {
        echo "export const VERSION = '${VERSION}';"
        echo "export const COMMIT_HASH = '${COMMIT_HASH}';"
    } > www/version.js

# Build and run the server in one command
dev: build
    just run
