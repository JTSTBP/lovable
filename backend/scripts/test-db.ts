
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Attempting to connect to the database...')
  try {
    // Just try to query accounts, expecting 0 results or connection error
    const count = await prisma.account.count()
    console.log(`Connection successful! Found ${count} accounts.`)
  } catch (e) {
    console.error('Connection failed (expected if DB is not running or creds are wrong):')
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
