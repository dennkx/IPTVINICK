@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM ============================================================
REM  Edite a linha abaixo com o URL HTTPS do repositorio GitHub
REM  (ex.: https://github.com/meunome/iptv-inick.git)
REM ============================================================
set "ORIGIN_URL=https://github.com/SEU_USUARIO/SEU_REPO.git"

where git >nul 2>nul
if errorlevel 1 set "PATH=%ProgramFiles%\Git\cmd;%ProgramFiles(x86)%\Git\cmd;%PATH%"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo Erro: esta pasta nao e um repositorio Git.
  pause
  exit /b 1
)

git config --get remote.origin.url >nul 2>&1
if errorlevel 1 (
  git remote add origin "%ORIGIN_URL%"
) else (
  git remote set-url origin "%ORIGIN_URL%"
)

echo.
echo Remote: origin
git remote get-url origin
echo.
echo Na primeira vez o Git abre o navegador para login GitHub
echo (Git Credential Manager). Se pedir utilizador/senha no CMD:
echo   - Utilizador: o seu nome de utilizador GitHub
echo   - Senha: um Personal Access Token (nao a senha da conta)
echo     https://github.com/settings/tokens
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo Push falhou. Confirme ORIGIN_URL em push-github.cmd e que o repo existe vazio no GitHub.
  pause
  exit /b 1
)
echo.
echo Concluido.
pause
