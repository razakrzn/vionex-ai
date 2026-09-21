# Version Management Guide

This project uses semantic versioning (SemVer) for version management.

## Current Version
- **Version**: 1.0.0
- **Location**: `package.json` and `src/config/version.ts`

## Version Format
Follows Semantic Versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (1.0.0 → 1.0.1)

## How to Update Version

### Method 1: Using npm scripts (Recommended)
```bash
# Patch version (bug fixes)
npm run version:patch

# Minor version (new features)
npm run version:minor

# Major version (breaking changes)
npm run version:major
```

These commands will:
- Update `package.json` version
- Create a git commit
- Create a git tag

### Method 2: Manual Update
1. Update version in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Update version in `src/config/version.ts`:
   ```typescript
   export const APP_VERSION = "1.0.1";
   ```

3. Commit changes:
   ```bash
   git add package.json src/config/version.ts
   git commit -m "Bump version to 1.0.1"
   git tag -a v1.0.1 -m "Release version 1.0.1"
   git push origin main --tags
   ```

## View Current Version
```bash
npm run version:show
```

## Version Display
The version is automatically displayed in:
- Footer component (bottom of every page)

## Git Tags for Releases
After updating version, create a git tag:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags
```

## Best Practices
1. Always update both `package.json` and `src/config/version.ts` when bumping version
2. Create git tags for each release
3. Use semantic versioning consistently
4. Document breaking changes in release notes

