# SSH Keys

Este diretório contém as chaves SSH que serão copiadas para o container durante o build.

## ⚠️ IMPORTANTE - Segurança

**NUNCA commite chaves SSH privadas no Git!**

As chaves privadas (`id_ed25519`, `id_rsa`, etc.) estão no `.gitignore` e não devem ser commitadas.

## Estrutura

```
ssh-keys/
├── id_ed25519          # Chave privada (NÃO commitar)
├── id_ed25519.pub      # Chave pública (pode commitar se necessário)
└── README.md          # Este arquivo
```

## Como funciona

1. As chaves são copiadas para o container durante o build do Dockerfile
2. Permissões são configuradas automaticamente (600 para privadas, 644 para públicas)
3. GitHub e GitLab são adicionados ao `known_hosts` automaticamente
4. O script `setup-ssh.sh` testa as conexões ao iniciar o container

## Adicionar novas chaves

1. Coloque a chave privada em `ssh-keys/id_ed25519` (ou outro nome)
2. Coloque a chave pública em `ssh-keys/id_ed25519.pub`
3. Reconstrua o container: `F1` → "Dev Containers: Rebuild Container"

## Alternativa: Usar chaves do host

Se preferir usar as chaves do seu host (mais seguro), você pode:
1. Remover as chaves deste diretório
2. Descomentar no `docker-compose.yml`:
   ```yaml
   - ~/.ssh:/home/root/.ssh:ro
   ```

