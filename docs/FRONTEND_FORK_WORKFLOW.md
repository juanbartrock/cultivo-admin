# Frontend Fork Workflow

Este flujo evita impactar el repositorio principal durante un refactor grande del frontend.

## 1. Crear fork

1. Crear un fork de `juanbartrock/cultivo-admin` en tu cuenta personal.
2. Clonar tu fork o reconfigurar el remoto local.

## 2. Reconfigurar remotos (repo local existente)

```powershell
git remote rename origin upstream
git remote add origin <URL_DE_TU_FORK>
git fetch --all --prune
git branch --set-upstream-to=origin/main main
```

## 3. Modelo de ramas recomendado

- `feat/frontend-foundation`
- `feat/frontend-sala`
- `feat/frontend-carpa`
- `feat/frontend-seguimientos`
- `feat/frontend-automatizaciones`

## 4. Quality gate antes de PR

```powershell
git config core.hooksPath .husky
cd frontend
npm run lint
npm run typecheck
npm run test:e2e
```

## 5. Sincronización con upstream

```powershell
git fetch upstream
git checkout main
git rebase upstream/main
git push origin main --force-with-lease
```

