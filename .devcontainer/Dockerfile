FROM oven/bun:latest

# Install git and other useful tools
RUN apt-get update && \
    apt-get install -y \
    git \
    curl \
    wget \
    vim \
    nano \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Configure git
RUN git config --global --add safe.directory /workspace && \
    git config --global user.email "hugo_fernandes2010@hotmail.com" && \
    git config --global user.name "Hugo Fernandes"

# Criar diretório .ssh com permissões corretas
RUN mkdir -p /home/root/.ssh && \
    chmod 700 /home/root/.ssh && \
    chown -R root:root /home/root/.ssh

# Copiar chaves SSH do contexto de build
COPY ssh-keys/ /home/root/.ssh/

# Configurar permissões corretas das chaves SSH
RUN chmod 700 /home/root/.ssh && \
    chmod 600 /home/root/.ssh/id_ed25519 2>/dev/null || true && \
    chmod 644 /home/root/.ssh/id_ed25519.pub 2>/dev/null || true && \
    chown -R root:root /home/root/.ssh

# Adicionar GitHub e GitLab aos known_hosts (evita prompt na primeira conexão)
RUN mkdir -p /home/root/.ssh && \
    ssh-keyscan -H github.com >> /home/root/.ssh/known_hosts 2>/dev/null || true && \
    ssh-keyscan -H gitlab.com >> /home/root/.ssh/known_hosts 2>/dev/null || true && \
    chmod 600 /home/root/.ssh/known_hosts 2>/dev/null || true

