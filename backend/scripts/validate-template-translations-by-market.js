import assert from 'node:assert/strict'
import { initDb, getPool, closeDb } from '../src/db.js'
import { validateCampaignTemplatePayload } from '../src/lib/campaignTemplateTranslations.js'

const validPayload = {
  adVariants: [
    {
      primaryText: 'Texto base',
      headline: 'Titulo base',
      description: 'Descricao base'
    }
  ],
  translationsByMarket: {
    ARM: {
      adVariants: [
        {
          primaryText: 'Arabic primary text',
          headline: 'Arabic headline',
          description: 'Arabic description'
        }
      ]
    },
    ENCA: {
      adVariants: [
        {
          primaryText: 'Canada primary text',
          headline: 'Canada headline',
          description: 'Canada description'
        }
      ]
    }
  }
}

function assertValidationOk(payload, message) {
  const validation = validateCampaignTemplatePayload(payload)
  assert.equal(validation.ok, true, `${message}: ${validation.errors.join(', ')}`)
}

function assertValidationFails(payload, expectedMessage) {
  const validation = validateCampaignTemplatePayload(payload)
  assert.equal(validation.ok, false, 'Expected validation to fail')
  assert(validation.errors.some((error) => error.includes(expectedMessage)), `Expected error containing "${expectedMessage}", got: ${validation.errors.join(', ')}`)
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate translationsByMarket persistence')
  }

  assertValidationOk({}, 'Legacy empty payload should remain valid')
  assertValidationOk(validPayload, 'Valid translationsByMarket should pass')
  assertValidationFails(
    {
      translationsByMarket: {
        ZZZZ: {
          adVariants: [{ primaryText: 'Invalid market' }]
        }
      }
    },
    'valid marketCode'
  )
  assertValidationFails(
    {
      translationsByMarket: {
        ARM: {
          adVariants: [{ primaryText: 123 }]
        }
      }
    },
    'primaryText must be a string'
  )

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const inserted = await client.query(
      `
        INSERT INTO campaign_templates (name, payload)
        VALUES ($1, $2::jsonb)
        RETURNING id, name, payload, created_at
      `,
      ['P44 translationsByMarket validation', JSON.stringify(validPayload)]
    )
    const template = inserted.rows[0]

    const found = await client.query(
      `
        SELECT id, name, payload, created_at
        FROM campaign_templates
        WHERE id = $1::uuid
      `,
      [template.id]
    )

    assert.equal(found.rowCount, 1, 'Expected inserted template to be readable')
    assert.deepEqual(found.rows[0].payload.translationsByMarket, validPayload.translationsByMarket)

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          table: 'campaign_templates',
          validatedMarkets: Object.keys(validPayload.translationsByMarket),
          rejectedInvalidMarketCode: true,
          rejectedInvalidFieldType: true,
          persistedTranslationsByMarket: true
        },
        null,
        2
      )
    )
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // best-effort rollback
    }
    throw err
  } finally {
    client.release()
    await closeDb()
  }
}

main().catch(async (err) => {
  console.error(`[validate-template-translations-by-market] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
