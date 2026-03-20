---
name: testing-patterns
description: Unit, integration, and E2E testing patterns for TypeScript/JavaScript projects
tags: [testing, jest, vitest, playwright, typescript]
triggers:
  - package: jest
  - package: vitest
  - package: "@playwright/test"
  - file: jest.config.js
  - file: jest.config.ts
  - file: vitest.config.ts
---

# Testing Patterns

> Áp dụng cho mọi project có test suite. Unit, integration, và E2E testing best practices.

## Test Organization

- **Unit tests**: Test từng function/class độc lập, mock dependencies
- **Integration tests**: Test nhiều layers cùng nhau (service + DB), không mock infrastructure
- **E2E tests**: Test user flows từ đầu đến cuối qua browser/API

```
src/
├── users/
│   ├── users.service.ts
│   ├── users.service.spec.ts    # ✅ unit test cạnh source file
│   └── users.service.integration.spec.ts
test/
└── e2e/
    └── user-flows.spec.ts
```

## Naming Convention

```typescript
// ✅ Tên test mô tả behavior, không mô tả implementation
describe('UsersService') {
  it('should throw NotFoundException when user does not exist')
  it('should return user with hashed password removed')
}

// ❌ Tên test mô tả implementation
it('calls findById and throws if null') { ... }
```

## AAA Pattern (Arrange, Act, Assert)

```typescript
it('should create user successfully', async () => {
  // Arrange
  const dto = { email: 'test@example.com', name: 'Test User' };
  mockRepo.create.mockResolvedValue({ id: '1', ...dto });

  // Act
  const result = await service.createUser(dto);

  // Assert
  expect(result.id).toBeDefined();
  expect(result.email).toBe(dto.email);
  expect(mockRepo.create).toHaveBeenCalledWith(dto);
});
```

## Mocking Guidelines

- Mock **external dependencies** (DB, HTTP, queues), không mock internal helpers
- Dùng `jest.mock()` / `vi.mock()` ở module level — reset trong `beforeEach`
- Tránh implementation detail testing — test behavior, not internals

## Coverage Targets

- Minimum **80% line coverage** cho business logic
- **100% coverage** cho utility functions và critical paths
- Đừng game coverage bằng trivial tests — quality > quantity
