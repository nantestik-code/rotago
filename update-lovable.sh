#!/bin/bash

# Script para atualização automática do repositório Lovable
echo "🚀 Iniciando atualização automática para o Lovable..."

# Adicionar todas as alterações
git add .
echo "✅ Alterações adicionadas ao stage"

# Obter a data atual para o commit
DATE=$(date +"%d/%m/%Y %H:%M")
COMMIT_MSG="Atualização automática: $DATE"

# Criar commit
git commit -m "$COMMIT_MSG"
echo "✅ Commit criado: $COMMIT_MSG"

# Enviar para o repositório remoto
git push origin main
echo "✅ Alterações enviadas para o repositório remoto"

echo "🎉 Atualização concluída com sucesso!"
