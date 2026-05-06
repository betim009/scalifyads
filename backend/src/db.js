export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    return { enabled: false }
  }

  return { enabled: true, databaseUrl }
}
