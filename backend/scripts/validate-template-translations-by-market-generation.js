import assert from 'node:assert/strict'
import { initDb, getPool, closeDb } from '../src/db.js'
import { generateTranslationsByMarket } from '../src/lib/campaignTemplateTranslations.js'

const basePayload = {
  adVariants: [
    {
      primaryText: 'Texto principal base',
      headline: 'Titulo base',
      description: 'Descricao base'
    },
    {
      primaryText: 'Segundo texto',
      headline: 'Segundo titulo',
      description: 'Segunda descricao'
    }
  ],
  destinationUrl: 'https://example.com/plants?utm_campaign=BR&src=BR-PlantasBTN-FB',
  ctaType: 'LEARN_MORE',
  translationsByMarket: {
    ARM: {
      adVariants: [
        {
          primaryText: 'TRADUCAO EXISTENTE',
          headline: 'HEADLINE EXISTENTE',
          description: 'DESCRIPTION EXISTENTE'
        }
      ]
    }
  }
}

async function fakeTranslateText({ q, target, marketCode, field } = {}) {
  return `[${marketCode}:${target}:${field}] ${q}`
}

function assertArmPreserved(payload) {
  assert.equal(payload.translationsByMarket.ARM.adVariants[0].primaryText, 'TRADUCAO EXISTENTE')
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate translationsByMarket generation')
  }

  const invalid = await generateTranslationsByMarket({
    payload: basePayload,
    markets: ['ZZZZ'],
    translateText: fakeTranslateText
  })
  assert.equal(invalid.ok, false, 'Invalid marketCode should fail')
  assert(invalid.errors.some((error) => error.includes('Invalid marketCode: ZZZZ')), 'Expected invalid marketCode error')

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
      ['P45 translationsByMarket generation validation', JSON.stringify(basePayload)]
    )
    const template = inserted.rows[0]

    const preserveResult = await generateTranslationsByMarket({
      payload: template.payload,
      markets: ['ARM', 'ENCA'],
      overwrite: false,
      translateText: fakeTranslateText
    })
    assert.equal(preserveResult.ok, true, `Preserve generation should pass: ${preserveResult.errors.join(', ')}`)
    assert.deepEqual(preserveResult.preserved, ['ARM'])
    assertArmPreserved(preserveResult.payload)
    assert.equal(preserveResult.payload.translationsByMarket.ENCA.adVariants.length, 2)
    assert.equal(preserveResult.payload.translationsByMarket.ENCA.adVariants[0].primaryText, '[ENCA:en:primaryText] Texto principal base')
    assert.equal(preserveResult.payload.translationsByMarket.ENCA.adVariants[0].headline, '[ENCA:en:headline] Titulo base')
    assert.equal(preserveResult.payload.translationsByMarket.ENCA.adVariants[0].description, '[ENCA:en:description] Descricao base')
    assert.equal(preserveResult.payload.destinationUrl, basePayload.destinationUrl, 'Technical destinationUrl should remain unchanged')
    assert.equal(preserveResult.payload.ctaType, basePayload.ctaType, 'Technical ctaType should remain unchanged')

    const updatedPreserve = await client.query(
      `
        UPDATE campaign_templates
        SET payload = $2::jsonb
        WHERE id = $1::uuid
        RETURNING id, name, payload, created_at
      `,
      [template.id, JSON.stringify(preserveResult.payload)]
    )
    assertArmPreserved(updatedPreserve.rows[0].payload)

    const overwriteResult = await generateTranslationsByMarket({
      payload: updatedPreserve.rows[0].payload,
      markets: ['ARM'],
      overwrite: true,
      translateText: fakeTranslateText
    })
    assert.equal(overwriteResult.ok, true, `Overwrite generation should pass: ${overwriteResult.errors.join(', ')}`)
    assert.deepEqual(overwriteResult.preserved, [])
    assert.equal(overwriteResult.payload.translationsByMarket.ARM.adVariants[0].primaryText, '[ARM:ar:primaryText] Texto principal base')

    const updatedOverwrite = await client.query(
      `
        UPDATE campaign_templates
        SET payload = $2::jsonb
        WHERE id = $1::uuid
        RETURNING id, name, payload, created_at
      `,
      [template.id, JSON.stringify(overwriteResult.payload)]
    )

    assert.equal(updatedOverwrite.rows[0].payload.translationsByMarket.ARM.adVariants[0].primaryText, '[ARM:ar:primaryText] Texto principal base')
    assert.equal(updatedOverwrite.rows[0].payload.translationsByMarket.ENCA.adVariants[0].primaryText, '[ENCA:en:primaryText] Texto principal base')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          table: 'campaign_templates',
          generatedMarkets: ['ARM', 'ENCA'],
          invalidMarketRejected: true,
          overwriteFalsePreservedExisting: true,
          overwriteTrueReplacedExisting: true,
          technicalFieldsUnchanged: true
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
  console.error(`[validate-template-translations-by-market-generation] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
