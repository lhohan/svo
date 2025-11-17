# Image Processor WASM - Task Runner
# Run 'just --list' to see all available commands

set dotenv-load

# Run the development server
run:
    simple-http-server www -p 8000 -i

# Build WASM in development mode (faster iteration)
build:
    wasm-pack build --target web

# Build WASM in release mode (optimized for production)
build-release:
    wasm-pack build --target web --release

# Build and run the server in one command
dev: build
    just run
