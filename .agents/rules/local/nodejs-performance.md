---
name: nodejs-performance
description: Node.js performance patterns, async best practices, and memory management
tags: [nodejs, performance, async, backend, javascript]
triggers:
  - file: package.json
  - package: express
  - package: fastify
  - package: "@nestjs/core"
---

# Node.js Performance Patterns

> Áp dụng cho Node.js backend services. Tập trung vào async patterns và tránh các anti-patterns phổ biến.

## Async/Await

- Luôn `await` promises — không fire-and-forget trừ khi có error handling
- Dùng `Promise.all()` cho parallel operations, không await tuần tự nếu không cần thiết
- Tránh `async` wrapper không cần thiết — chỉ dùng khi có `await` bên trong

```typescript
// ✅ Parallel execution khi không dependent nhau
const [user, orders] = await Promise.all([
  findUser(userId),
  findOrders(userId),
]);

// ❌ Sequential khi có thể parallel
const user = await findUser(userId);
const orders = await findOrders(userId);
```

## Error Handling

- Wrap async express routes trong try-catch hoặc dùng `express-async-errors`
- Không swallow errors với empty catch blocks
- Log errors với context trước khi re-throw

```typescript
// ✅ Error không bị swallow
try {
  await processPayment(data);
} catch (error) {
  logger.error({ error, data }, 'Payment processing failed');
  throw error; // re-throw để caller xử lý
}

// ❌ Silent failure
try {
  await processPayment(data);
} catch (error) {
  // swallowed!
}
```

## Memory Management

- Không giữ reference lớn trong closure nếu không cần
- Stream large data thay vì load toàn bộ vào memory
- Dùng `Buffer.alloc()` thay vì `new Buffer()` (deprecated)

## Event Loop

- Không block event loop với sync CPU-intensive operations
- Dùng `worker_threads` cho CPU-intensive tasks
- Batch DB queries thay vì N+1 queries trong loop
