#!/bin/bash
# Script para configurar SSH no container

# Garantir que o diretório .ssh existe e tem permissões corretas
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Ajustar permissões das chaves SSH (já copiadas no Dockerfile)
if [ -d ~/.ssh ] && [ "$(ls -A ~/.ssh)" ]; then
  echo "Configurando permissões das chaves SSH..."
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/id_ed25519 2>/dev/null || true
  chmod 644 ~/.ssh/id_ed25519.pub 2>/dev/null || true
  chmod 600 ~/.ssh/config 2>/dev/null || true
  chmod 600 ~/.ssh/known_hosts 2>/dev/null || true
  chown -R root:root ~/.ssh 2>/dev/null || true
  echo "✅ Chaves SSH configuradas!"
  
  # Listar chaves disponíveis
  echo "Chaves SSH disponíveis:"
  ls -la ~/.ssh/*.pub 2>/dev/null || echo "Nenhuma chave pública encontrada"
else
  echo "⚠️  Nenhuma chave SSH encontrada em ~/.ssh/"
fi

# Testar conexão SSH com GitHub
if command -v ssh &> /dev/null; then
  echo ""
  echo "Testando conexão SSH com GitHub..."
  ssh -T git@github.com 2>&1 | head -1 || echo "⚠️  Não foi possível conectar ao GitHub via SSH"
  
  echo ""
  echo "Testando conexão SSH com GitLab..."
  ssh -T git@gitlab.com 2>&1 | head -1 || echo "⚠️  Não foi possível conectar ao GitLab via SSH"
fi

