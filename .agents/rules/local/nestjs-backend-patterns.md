---
name: nestjs-backend-patterns
description: NestJS architecture, dependency injection, module design, and API patterns
tags: [nestjs, nodejs, backend, typescript, api]
triggers:
  - file: nest-cli.json
  - package: "@nestjs/core"
  - package: "@nestjs/common"
---

# NestJS Backend Patterns

> Áp dụng cho NestJS API services. Tập trung vào module architecture và dependency injection đúng cách.

## Module Organization

- Mỗi feature là một **standalone module** (`@Module`) với controller, service, repository riêng
- Không import service của module khác trực tiếp — expose qua module exports
- Dùng **barrel exports** (`index.ts`) để clean import paths

```typescript
// ✅ Module đóng gói đúng cách
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // chỉ export những gì cần
})
export class UsersModule {}
```

## Dependency Injection

- Inject qua constructor, KHÔNG dùng property injection
- Dùng custom providers (`useFactory`, `useValue`) cho config phức tạp
- Tránh circular dependencies — refactor sang shared module nếu cần

## Guards & Interceptors

- Dùng `Guards` cho authentication/authorization — không check auth trong service
- Dùng `Interceptors` cho logging, transform response, caching
- Dùng `Pipes` cho validation + transformation của input

```typescript
// ✅ Auth trong Guard, không phải trong service
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('/admin')
async adminEndpoint() { ... }

// ❌ Auth check trong service — sai pattern
async adminAction(userId: string) {
  if (!isAdmin(userId)) throw new ForbiddenException();
}
```

## Error Handling

- Throw `HttpException` subclasses trong controllers/services: `NotFoundException`, `BadRequestException`...
- Dùng global `ExceptionFilter` để format error responses nhất quán
- Log errors với correlation ID trước khi throw

## DTOs & Validation

- Dùng `class-validator` + `class-transformer` cho tất cả DTO
- Validate `@Body()`, `@Query()`, `@Param()` ngay tại controller layer
- Không accept `any` — mọi input phải có DTO type
