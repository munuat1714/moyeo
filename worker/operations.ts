export async function consumeRateLimit(db: D1Database, scope: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const bucketStart = Math.floor(now / windowSeconds) * windowSeconds
  const row = await db.prepare(`INSERT INTO request_rate_limits (scope,bucket_start,request_count,expires_at)
    VALUES (?1,?2,1,?3)
    ON CONFLICT(scope,bucket_start) DO UPDATE SET request_count=request_count+1
    RETURNING request_count`).bind(scope, bucketStart, bucketStart + windowSeconds * 2).first<{ request_count: number }>()
  return {
    allowed: Number(row?.request_count ?? limit + 1) <= limit,
    retryAfter: Math.max(1, bucketStart + windowSeconds - now),
  }
}

export async function acquireOperationLock(db: D1Database, name: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const owner = crypto.randomUUID()
  const row = await db.prepare(`INSERT INTO operation_locks (name,owner,locked_until) VALUES (?1,?2,?3)
    ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,locked_until=excluded.locked_until
    WHERE operation_locks.locked_until<=?4 RETURNING owner`)
    .bind(name, owner, now + ttlSeconds, now).first<{ owner: string }>()
  return row?.owner === owner ? owner : null
}

export async function releaseOperationLock(db: D1Database, name: string, owner: string) {
  await db.prepare('DELETE FROM operation_locks WHERE name=?1 AND owner=?2').bind(name, owner).run()
}
