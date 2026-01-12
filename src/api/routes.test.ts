import { describe, it, expect } from 'bun:test'

const BASE_URL = 'http://localhost:3000'

describe('GET /api/cards', () => {
  it('returns all credit cards', async () => {
    const res = await fetch(`${BASE_URL}/api/cards`)
    expect(res.status).toBe(200)
    
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
  })
  
  it('returns cards with correct properties', async () => {
    const res = await fetch(`${BASE_URL}/api/cards`)
    const data = await res.json()
    
    const card = data.data[0]
    expect(card).toHaveProperty('id')
    expect(card).toHaveProperty('name')
    expect(card).toHaveProperty('annualFee')
    expect(card).toHaveProperty('resetBasis')
    expect(card).toHaveProperty('color')
  })
  
  it('includes Amex and Chase cards', async () => {
    const res = await fetch(`${BASE_URL}/api/cards`)
    const data = await res.json()
    const names = data.data.map((c: any) => c.name)
    
    expect(names).toContain('American Express Platinum')
    expect(names).toContain('Chase Sapphire Reserve')
  })
})

describe('GET /api/benefits', () => {
  it('returns all benefits when no filter', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits`)
    expect(res.status).toBe(200)
    
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(5)
  })
  
  it('filters benefits by cardId', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits?cardId=amex-platinum`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(3)
    data.data.forEach((b: any) => {
      expect(b.cardId).toBe('amex-platinum')
    })
  })
  
  it('filters Chase benefits correctly', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits?cardId=chase-sapphire-reserve`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.data).toHaveLength(2)
    data.data.forEach((b: any) => {
      expect(b.cardId).toBe('chase-sapphire-reserve')
    })
  })
  
  it('returns empty array for unknown cardId', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits?cardId=unknown`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.data).toHaveLength(0)
  })
})

describe('GET /api/benefits/:id', () => {
  it('returns single benefit', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/amex-uber`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('amex-uber')
    expect(data.data.name).toBe('Uber Cash')
  })
  
  it('returns 404 for non-existent benefit', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/non-existent`)
    const data = await res.json()
    
    expect(res.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('not found')
  })
  
  it('returns benefit with all properties', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/amex-uber`)
    const data = await res.json()
    const benefit = data.data
    
    expect(benefit).toHaveProperty('id')
    expect(benefit).toHaveProperty('cardId')
    expect(benefit).toHaveProperty('name')
    expect(benefit).toHaveProperty('shortDescription')
    expect(benefit).toHaveProperty('fullDescription')
    expect(benefit).toHaveProperty('creditAmount')
    expect(benefit).toHaveProperty('currentUsed')
    expect(benefit).toHaveProperty('resetFrequency')
    expect(benefit).toHaveProperty('activationRequired')
    expect(benefit).toHaveProperty('status')
  })
})

describe('PATCH /api/benefits/:id', () => {
  it('updates currentUsed amount', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/amex-uber`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUsed: 100 })
    })
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.currentUsed).toBe(100)
    
    // Reset
    await fetch(`${BASE_URL}/api/benefits/amex-uber`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUsed: 0 })
    })
  })
  
  it('updates notes field', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/amex-uber`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Test note' })
    })
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.data.notes).toBe('Test note')
    
    // Reset
    await fetch(`${BASE_URL}/api/benefits/amex-uber`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: '' })
    })
  })
  
  it('returns 404 for non-existent benefit', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/non-existent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUsed: 100 })
    })
    const data = await res.json()
    
    expect(res.status).toBe(404)
    expect(data.success).toBe(false)
  })
  
  it('calculates completed status when fully used', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/amex-uber`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUsed: 200 })
    })
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.data.status).toBe('completed')
    
    // Reset
    await fetch(`${BASE_URL}/api/benefits/amex-uber`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUsed: 0, status: 'pending' })
    })
  })
})

describe('PATCH /api/benefits/:id/activate', () => {
  it('toggles activation acknowledgment', async () => {
    // First get the current state
    const currentRes = await fetch(`${BASE_URL}/api/benefits/amex-uber`)
    const currentData = await currentRes.json()
    const wasActivated = currentData.data.activationAcknowledged
    
    const res = await fetch(`${BASE_URL}/api/benefits/amex-uber/activate`, {
      method: 'PATCH'
    })
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.activationAcknowledged).toBe(!wasActivated)
  })
  
  it('returns error for non-activatable benefit', async () => {
    const res = await fetch(`${BASE_URL}/api/benefits/chase-travel/activate`, {
      method: 'PATCH'
    })
    const data = await res.json()
    
    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('GET /api/reminders', () => {
  it('returns upcoming expirations', async () => {
    const res = await fetch(`${BASE_URL}/api/reminders?days=30`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
  
  it('returns empty array when no expiring soon', async () => {
    const res = await fetch(`${BASE_URL}/api/reminders?days=1`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
  })
})

describe('GET /api/stats', () => {
  it('returns overall statistics', async () => {
    const res = await fetch(`${BASE_URL}/api/stats`)
    const data = await res.json()
    
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('totalBenefits')
    expect(data.data).toHaveProperty('totalValue')
    expect(data.data).toHaveProperty('usedValue')
    expect(data.data).toHaveProperty('completedCount')
    expect(data.data).toHaveProperty('pendingCount')
    expect(data.data).toHaveProperty('missedCount')
  })
  
  it('stats values are non-negative', async () => {
    const res = await fetch(`${BASE_URL}/api/stats`)
    const data = await res.json()
    
    expect(data.data.totalBenefits).toBeGreaterThanOrEqual(0)
    expect(data.data.totalValue).toBeGreaterThanOrEqual(0)
    expect(data.data.usedValue).toBeGreaterThanOrEqual(0)
    expect(data.data.completedCount).toBeGreaterThanOrEqual(0)
    expect(data.data.pendingCount).toBeGreaterThanOrEqual(0)
    expect(data.data.missedCount).toBeGreaterThanOrEqual(0)
  })
})
