#!/bin/bash
# Script para configurar SSH e Git no container

set -e  # Parar em caso de erro

echo "🚀 Iniciando configuração do devcontainer..."

# Garantir que o diretório .ssh existe e tem permissões corretas
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Se as chaves não estiverem em ~/.ssh, copiar do workspace (caso o container não tenha sido reconstruído)
if [ ! -f ~/.ssh/id_ed25519 ] && [ -f /workspace/.devcontainer/ssh-keys/id_ed25519 ]; then
  echo "📋 Copiando chaves SSH do workspace..."
  cp /workspace/.devcontainer/ssh-keys/id_ed25519 ~/.ssh/
  cp /workspace/.devcontainer/ssh-keys/id_ed25519.pub ~/.ssh/
  echo "✅ Chaves SSH copiadas do workspace"
fi

# Ajustar permissões das chaves SSH (já copiadas no Dockerfile)
if [ -d ~/.ssh ]; then
  echo "📝 Configurando permissões das chaves SSH..."
  chmod 700 ~/.ssh
  
  # Ajustar permissões de todas as chaves encontradas
  if [ -f ~/.ssh/id_ed25519 ]; then
    chmod 600 ~/.ssh/id_ed25519
    echo "✅ Chave privada id_ed25519 configurada"
  fi
  if [ -f ~/.ssh/id_ed25519.pub ]; then
    chmod 644 ~/.ssh/id_ed25519.pub
    echo "✅ Chave pública id_ed25519.pub configurada"
  fi
  if [ -f ~/.ssh/config ]; then
    chmod 600 ~/.ssh/config
  fi
  if [ -f ~/.ssh/known_hosts ]; then
    chmod 600 ~/.ssh/known_hosts
  fi
  
  chown -R root:root ~/.ssh 2>/dev/null || true
  
  # Listar chaves disponíveis
  echo ""
  echo "🔑 Chaves SSH encontradas:"
  find ~/.ssh -name "id_*" -type f 2>/dev/null | while read key; do
    echo "   - $key ($(stat -c '%a' "$key" 2>/dev/null || stat -f '%A' "$key" 2>/dev/null))"
  done || ls -la ~/.ssh/id_* 2>/dev/null || echo "   Nenhuma chave encontrada"
else
  echo "⚠️  Diretório ~/.ssh não existe!"
fi

# Configurar Git (garantir que está configurado mesmo se o Dockerfile falhar)
echo ""
echo "⚙️  Configurando Git..."
git config --global user.email "hugo_fernandes2010@hotmail.com" || true
git config --global user.name "Hugo Fernandes" || true
git config --global --add safe.directory /workspace || true

echo "✅ Git configurado:"
echo "   Nome: $(git config --global user.name)"
echo "   Email: $(git config --global user.email)"

# Testar conexão SSH com GitHub
if command -v ssh &> /dev/null; then
  echo ""
  echo "🔍 Testando conexão SSH com GitHub..."
  ssh -T git@github.com 2>&1 | head -1 || echo "⚠️  Não foi possível conectar ao GitHub via SSH"
  
  echo ""
  echo "🔍 Testando conexão SSH com GitLab..."
  ssh -T git@gitlab.com 2>&1 | head -1 || echo "⚠️  Não foi possível conectar ao GitLab via SSH"
fi

echo ""
echo "✅ Configuração do devcontainer concluída!"

