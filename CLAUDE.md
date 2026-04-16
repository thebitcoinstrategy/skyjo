# Skyjo Project Guidelines

## Deployment Workflow
Always commit and deploy automatically when the user asks to deploy. Steps:
1. Increment version in `packages/client/src/version.ts`
2. `git add` changed files and `git commit` with version in message
3. `git push origin master`
4. Create tarball: `tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='*.tsbuildinfo' -czf /tmp/skyjo-deploy.tar.gz -C <project-root> .`
5. `scp /tmp/skyjo-deploy.tar.gz root@152.42.211.101:/opt/skyjo-deploy.tar.gz`
6. `ssh root@152.42.211.101 "cd /opt/skyjo && rm -rf packages tsconfig.base.json && tar -xzf /opt/skyjo-deploy.tar.gz && rm /opt/skyjo-deploy.tar.gz && docker compose -f docker-compose.prod.yml up --build -d"`
7. Verify containers are running

## Version Management
- Version lives in `packages/client/src/version.ts` as `APP_VERSION`
- Increment with every deploy (patch for fixes, minor for features)
- Display on HomeScreen bottom-right corner

## Language
- All user-facing text is in German

## Tech Notes
- Tailwind CSS 4 uses `@tailwindcss/vite` plugin (not PostCSS)
- Server build must use `tsc -b` (not plain `tsc`)
- `.dockerignore` must exclude `.tsbuildinfo` to prevent stale incremental builds
- React hooks must be called before any conditional early returns
