---
name: postgres-patterns
description: PostgreSQL query optimization, schema design, indexing, and safe query patterns
tags: [postgresql, database, sql, performance, backend]
triggers:
  - package: pg
  - package: "@prisma/client"
  - package: typeorm
  - package: knex
  - file: prisma/schema.prisma
---

# PostgreSQL Patterns

> Áp dụng cho dự án dùng PostgreSQL. Tập trung vào performance, index design, và an toàn khi query.

## Schema Design

- Luôn có `created_at TIMESTAMPTZ DEFAULT NOW()` và `updated_at TIMESTAMPTZ` cho mọi table
- Dùng `UUID` làm primary key cho distributed systems, `BIGSERIAL` cho local high-performance
- Foreign keys phải có index tương ứng để avoid sequential scan khi JOIN

```sql
-- ✅ Đúng: FK với index
ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- ❌ Sai: FK không có index
ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
```

## Query Safety

- KHÔNG bao giờ string concatenate user input vào SQL — luôn dùng parameterized queries
- Với Prisma: dùng `prisma.$queryRaw` với `Prisma.sql` template literals
- Validate và sanitize input ở application layer trước khi đến query

```typescript
// ✅ Parameterized query
const users = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ❌ String concatenation — SQL injection risk
const users = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

## Indexing Strategy

- Index columns thường xuất hiện trong `WHERE`, `JOIN ON`, `ORDER BY`
- Composite index: thứ tự quan trọng — column có cardinality cao nhất đặt đầu
- Dùng `EXPLAIN ANALYZE` để verify index đang được dùng

## Transactions

- Wrap các operations liên quan trong transaction để đảm bảo atomicity
- Giữ transactions ngắn — không làm I/O bên ngoài DB trong transaction
- Dùng `SERIALIZABLE` isolation level chỉ khi thực sự cần

```typescript
// ✅ Transaction đúng cách (Prisma)
await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: orderData });
  await tx.inventory.update({ where: { id }, data: { quantity: { decrement: 1 } } });
});
```
