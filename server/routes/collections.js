// Generic CRUD + reorder for the ordered home-page collections
// (social links, stats, tools, ticker, certifications).
// Table and column names come from code (validation.js), never from requests;
// every value is a bound parameter.
import { Hono } from 'hono'
import { query } from '../db/client.js'
import { badRequest, conflict, notFound } from '../errors.js'
import { camel } from '../services/siteData.js'
import { collections, reorderSchema } from '../validation.js'
import { parse, pgCode, PG, readJson, snakeToCamel } from './helpers.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function collectionRouter({ table, columns, schema }) {
  const r = new Hono()
  const values = (data) => columns.map((col) => data[snakeToCamel(col)])
  const idParam = (c) => {
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) throw notFound()
    return id
  }
  const friendly = (err) => {
    if (pgCode(err) === PG.FOREIGN_KEY) {
      return table === 'certifications' && /image/.test(err.message || '')
        ? badRequest('Please fix the highlighted fields.', { fields: { imageId: 'That image no longer exists.' } })
        : conflict('This item is referenced elsewhere and cannot be changed that way.')
    }
    return err
  }

  r.get('/', async (c) => {
    const rows = await query(`select * from ${table} order by sort_order, created_at`)
    return c.json({ items: rows.map(camel) })
  })

  r.post('/', async (c) => {
    const data = parse(schema, await readJson(c))
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    try {
      const [row] = await query(
        `insert into ${table} (${columns.join(', ')}, sort_order)
         values (${placeholders}, (select coalesce(max(sort_order), -1) + 1 from ${table}))
         returning *`,
        values(data)
      )
      return c.json({ item: camel(row) }, 201)
    } catch (err) {
      throw friendly(err)
    }
  })

  r.put('/:id', async (c) => {
    const id = idParam(c)
    const data = parse(schema, await readJson(c))
    const sets = columns.map((col, i) => `${col} = $${i + 1}`).join(', ')
    try {
      const [row] = await query(
        `update ${table} set ${sets}, updated_at = now() where id = $${columns.length + 1} returning *`,
        [...values(data), id]
      )
      if (!row) throw notFound('This item no longer exists.')
      return c.json({ item: camel(row) })
    } catch (err) {
      throw friendly(err)
    }
  })

  r.delete('/:id', async (c) => {
    const id = idParam(c)
    const rows = await query(`delete from ${table} where id = $1 returning id`, [id])
    if (!rows.length) throw notFound('This item no longer exists.')
    return c.json({ ok: true })
  })

  r.post('/reorder', async (c) => {
    const { ids } = parse(reorderSchema, await readJson(c))
    await query(
      `update ${table} t set sort_order = x.ord - 1, updated_at = now()
         from unnest($1::uuid[]) with ordinality as x(id, ord)
        where t.id = x.id`,
      [ids]
    )
    return c.json({ ok: true })
  })

  return r
}

export const collectionRoutes = new Hono()
for (const [name, def] of Object.entries(collections)) {
  collectionRoutes.route(`/${name}`, collectionRouter(def))
}
