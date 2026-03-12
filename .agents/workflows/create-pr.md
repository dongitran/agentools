---
description: Create a GitHub Pull Request using gh CLI
---

# Create Pull Request Workflow

// turbo-all

## Steps

1. Check current branch and ensure all changes are committed
```bash
git status
```

2. Push the branch to origin (if not already pushed)
```bash
git push -u origin $(git branch --show-current)
```

3. Create the Pull Request
```bash
gh pr create --base main --title "PR_TITLE_HERE" --body "PR_BODY_HERE"
```

Replace `PR_TITLE_HERE` and `PR_BODY_HERE` with appropriate values based on the changes.

## Notes

- Use `--draft` flag to create a draft PR
- Use `--fill` flag to auto-fill title and body from commits
