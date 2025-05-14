# Script para atualização automática do repositório Lovable
Write-Host "🚀 Iniciando atualização automática para o Lovable..." -ForegroundColor Cyan

# Adicionar todas as alterações
git add .
Write-Host "✅ Alterações adicionadas ao stage" -ForegroundColor Green

# Obter a data atual para o commit
$date = Get-Date -Format "dd/MM/yyyy HH:mm"
$commitMsg = "Atualização automática: $date"

# Criar commit
git commit -m $commitMsg
Write-Host "✅ Commit criado: $commitMsg" -ForegroundColor Green

# Enviar para o repositório remoto
git push origin main
Write-Host "✅ Alterações enviadas para o repositório remoto" -ForegroundColor Green

Write-Host "🎉 Atualização concluída com sucesso!" -ForegroundColor Magenta
