import { createMiddleware } from 'hono/factory'

export const requireManager = createMiddleware<{
  Variables: { user: { role: string } }
}>(async (c, next) => {
  if (c.var.user.role !== 'manager') {
    return c.json({ success: false, error: 'เฉพาะผู้จัดการเท่านั้น' }, 403)
  }
  await next()
})
