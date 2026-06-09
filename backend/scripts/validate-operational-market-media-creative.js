import fsp from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { initDb, getPool, closeDb } from '../src/db.js'
import { publishOperationalCreative } from '../src/services/operationalMarketCreativePublisher.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function createFixture({ client, countryCode, storedName, mediaByMarket }) {
  const template = await client.query(
    `
      INSERT INTO campaign_templates (name, payload)
      VALUES ('P62 Media Validation', $1::jsonb)
      RETURNING id, payload
    `,
    [
      JSON.stringify({
        destinationUrl: 'https://example.com/p62',
        ctaType: 'LEARN_MORE',
        adVariants: [
          {
            primaryText: 'Texto base',
            headline: 'Headline base',
            description: 'Description base'
          }
        ],
        translationsByMarket: {
          ENCA: {
            language: 'en',
            adVariants: [
              {
                primaryText: 'Translated primary',
                headline: 'Translated headline',
                description: 'Translated description'
              }
            ]
          }
        },
        mediaByMarket
      })
    ]
  )

  const campaign = await client.query(
    `
      INSERT INTO campaigns (slug, name, status, scope, objective_key, created_by_user_id, config)
      VALUES ($1, 'P62 Media Validation Campaign', 'draft', 'global', NULL, NULL, $2::jsonb)
      RETURNING id
    `,
    [`p62-media-validation-${randomUUID()}`, JSON.stringify({ templateId: template.rows[0].id })]
  )

  const operational = await client.query(
    `
      INSERT INTO operational_market_generations (
        campaign_id,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview
      )
      VALUES ($1::uuid, 'ENCA', 'English Canada', 'ENCA-PlantasBTN-FB', '["CA"]'::jsonb, '{}'::jsonb)
      RETURNING id
    `,
    [campaign.rows[0].id]
  )

  const generated = await client.query(
    `
      INSERT INTO generated_campaigns (
        campaign_id,
        country_code,
        name,
        status,
        market_code,
        market_name,
        market_param,
        resolved_countries,
        targeting_preview,
        meta_campaign_id,
        meta_adset_id,
        meta_ad_account_id,
        meta_status,
        meta_effective_status
      )
      VALUES (
        $1::uuid,
        $2,
        'ENCA-PlantasBTN-FB',
        'PAUSED',
        'ENCA',
        'English Canada',
        'ENCA-PlantasBTN-FB',
        '["CA"]'::jsonb,
        '{}'::jsonb,
        'stub-campaign-p62',
        'stub-adset-p62',
        'act_123456789',
        'PAUSED',
        'PAUSED'
      )
      RETURNING id
    `,
    [campaign.rows[0].id, countryCode]
  )

  return {
    templatePayload: template.rows[0].payload,
    operationalMarketGenerationId: operational.rows[0].id,
    generatedCampaignId: generated.rows[0].id,
    storedName
  }
}

async function main() {
  const db = await initDb()
  if (!db.enabled) {
    throw new Error('DATABASE_URL is required to validate operational market media creative')
  }

  const pool = getPool()
  const client = await pool.connect()
  const uploadsDir = path.resolve('uploads', 'creative-assets')
  const imageStoredName = `p62-validation-${randomUUID()}.jpg`
  const imagePath = path.join(uploadsDir, imageStoredName)
  const calls = []

  try {
    await fsp.mkdir(uploadsDir, { recursive: true })
    await fsp.writeFile(imagePath, Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]))

    await client.query('BEGIN')

    const { rows: countryRows } = await client.query(`SELECT code FROM countries ORDER BY code ASC LIMIT 1`)
    const countryCode = countryRows[0]?.code
    assert(countryCode, 'Expected at least one seeded country')

    const asset = await client.query(
      `
        INSERT INTO creative_assets (id, stored_name, original_name, mime_type, size_bytes)
        VALUES (gen_random_uuid(), $1, 'p62-validation.jpg', 'image/jpeg', 9)
        RETURNING id
      `,
      [imageStoredName]
    )
    const creativeAssetId = asset.rows[0].id

    const mediaByMarket = {
      ENCA: {
        type: 'image',
        assetId: creativeAssetId,
        creativeAssetId,
        url: `/uploads/creative-assets/${imageStoredName}`,
        filename: 'p62-validation.jpg',
        mimeType: 'image/jpeg'
      }
    }

    const imageFixture = await createFixture({ client, countryCode, storedName: imageStoredName, mediaByMarket })
    assert(imageFixture.templatePayload.mediaByMarket.ENCA.assetId === creativeAssetId, 'mediaByMarket should persist assetId')

    const uploadImage = async ({ filePath, mimeType, originalName }) => {
      calls.push({ type: 'uploadImage', filePath, mimeType, originalName })
      assert(filePath.endsWith(imageStoredName), 'Image upload should use selected market asset file')
      assert(mimeType === 'image/jpeg', 'Image upload should preserve mime type')
      return { hash: 'stub-image-hash-p62' }
    }

    const uploadVideo = async () => {
      throw new Error('Video upload must not be called for image creative')
    }

    const createCreative = async ({ imageHash, videoId, link, message, headline, description }) => {
      calls.push({ type: 'createCreative', imageHash, videoId, link, message, headline, description })
      assert(imageHash === 'stub-image-hash-p62', 'Creative payload should include image_hash for selected image')
      assert(videoId === null, 'Creative payload should not include video_id for image creative')
      assert(link === 'https://example.com/p62', 'Creative link should come from template payload')
      assert(message === 'Translated primary', 'Creative message should use market translation')
      assert(headline === 'Translated headline', 'Creative headline should use market translation')
      assert(description === 'Translated description', 'Creative description should use market translation')
      return { id: 'stub-creative-image-p62' }
    }

    const imageResult = await publishOperationalCreative({
      client,
      operationalMarketGenerationId: imageFixture.operationalMarketGenerationId,
      body: { confirmPublishCreative: true, pageId: '123456789012345' },
      accessToken: 'fake-token-no-meta-call',
      createCreative,
      uploadImage,
      uploadVideo
    })
    assert(imageResult.creativePayload.mediaSource === 'image', 'Expected image media source')
    assert(imageResult.creativePayload.creativeAssetId === creativeAssetId, 'Expected creative asset id in result')
    assert(imageResult.creativePayload.imageHash === 'stub-image-hash-p62', 'Expected image hash in result')

    const fallbackFixture = await createFixture({ client, countryCode, storedName: null, mediaByMarket: {} })
    const fallbackResult = await publishOperationalCreative({
      client,
      operationalMarketGenerationId: fallbackFixture.operationalMarketGenerationId,
      body: { confirmPublishCreative: true, pageId: '123456789012345' },
      accessToken: 'fake-token-no-meta-call',
      createCreative: async ({ imageHash, videoId }) => {
        calls.push({ type: 'createCreativeFallback', imageHash, videoId })
        assert(imageHash === null, 'Fallback creative should not include image hash')
        assert(videoId === null, 'Fallback creative should not include video id')
        return { id: 'stub-creative-link-p62' }
      },
      uploadImage: async () => {
        throw new Error('Image upload must not be called for link fallback')
      },
      uploadVideo
    })
    assert(fallbackResult.creativePayload.mediaSource === 'link_fallback', 'Expected link fallback without media')

    await client.query('ROLLBACK')

    console.log(
      JSON.stringify(
        {
          ok: true,
          rolledBack: true,
          noRealMetaCall: true,
          savedMediaByMarket: mediaByMarket,
          imageCreativePayload: imageResult.creativePayload,
          fallbackCreativePayload: fallbackResult.creativePayload,
          calls: calls.map((call) => call.type)
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
    await fsp.rm(imagePath, { force: true })
    await closeDb()
  }
}

main().catch(async (err) => {
  console.error(`[validate-operational-market-media-creative] ${err?.message ?? err}`)
  await closeDb()
  process.exitCode = 1
})
