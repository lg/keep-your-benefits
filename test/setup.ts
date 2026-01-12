import 'happy-dom/global'
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'

beforeAll(() => {
  console.log('Starting test suite...')
})

afterAll(() => {
  console.log('Test suite complete.')
})

beforeEach(() => {
  // Reset any mocks or state between tests
})

afterEach(() => {
  // Cleanup after each test
})
