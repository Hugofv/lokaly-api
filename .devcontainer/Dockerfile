FROM oven/bun:latest

# Install git and other useful tools
RUN apt-get update && \
    apt-get install -y \
    git \
    curl \
    wget \
    vim \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Configure git (opcional - você pode configurar depois)
RUN git config --global --add safe.directory /workspace

