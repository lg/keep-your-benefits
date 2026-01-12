import { describe, it, expect } from 'bun:test'
import { getBenefits, getBenefitById } from '../models/storage'
import { getCardsWithBenefits, getAllBenefitsWithCards, updateBenefitUsage, toggleActivation, getStats } from './benefits'

describe('getCardsWithBenefits', () => {
  it('returns all cards with their benefits', () => {
    const cards = getCardsWithBenefits()
    
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveProperty('benefits')
    expect(cards[0]).toHaveProperty('stats')
  })
  
  it('returns Amex and Chase cards', () => {
    const cards = getCardsWithBenefits()
    const names = cards.map(c => c.name)
    expect(names).toContain('American Express Platinum')
    expect(names).toContain('Chase Sapphire Reserve')
  })
  
  it('calculates correct stats for each card', () => {
    const cards = getCardsWithBenefits()
    const amex = cards.find(c => c.id === 'amex-platinum')
    const chase = cards.find(c => c.id === 'chase-sapphire-reserve')
    
    expect(amex?.stats.totalBenefits).toBe(3)
    expect(amex?.stats.totalValue).toBe(500)
    expect(chase?.stats.totalBenefits).toBe(2)
    expect(chase?.stats.totalValue).toBe(420)
  })
  
  it('each card has benefits array', () => {
    const cards = getCardsWithBenefits()
    cards.forEach(card => {
      expect(Array.isArray(card.benefits)).toBe(true)
      expect(card.benefits.length).toBeGreaterThan(0)
    })
  })
})

describe('getAllBenefitsWithCards', () => {
  it('returns all benefits with card information', () => {
    const benefits = getAllBenefitsWithCards()
    
    expect(benefits).toHaveLength(5)
    expect(benefits[0]).toHaveProperty('card')
  })
  
  it('links each benefit to its card', () => {
    const benefits = getAllBenefitsWithCards()
    const uberBenefit = benefits.find(b => b.id === 'amex-uber')
    const travelBenefit = benefits.find(b => b.id === 'chase-travel')
    
    expect(uberBenefit?.card?.id).toBe('amex-platinum')
    expect(uberBenefit?.card?.name).toBe('American Express Platinum')
    expect(travelBenefit?.card?.id).toBe('chase-sapphire-reserve')
    expect(travelBenefit?.card?.name).toBe('Chase Sapphire Reserve')
  })
  
  it('includes all card properties', () => {
    const benefits = getAllBenefitsWithCards()
    const benefit = benefits[0]
    
    expect(benefit.card).toHaveProperty('id')
    expect(benefit.card).toHaveProperty('name')
    expect(benefit.card).toHaveProperty('annualFee')
    expect(benefit.card).toHaveProperty('resetBasis')
    expect(benefit.card).toHaveProperty('color')
  })
})

describe('updateBenefitUsage', () => {
  it('updates currentUsed amount', () => {
    const benefit = getBenefitById('amex-uber')
    const originalUsed = benefit?.currentUsed ?? 0
    
    const updated = updateBenefitUsage('amex-uber', 100)
    
    expect(updated.currentUsed).toBe(100)
    expect(updated.status).toBe('pending')
    
    // Reset for other tests
    updateBenefitUsage('amex-uber', originalUsed)
  })
  
  it('calculates completed status when fully used', () => {
    const updated = updateBenefitUsage('amex-uber', 200)
    expect(updated.status).toBe('completed')
    
    // Reset
    updateBenefitUsage('amex-uber', 0)
  })
  
  it('updates notes when provided', () => {
    const updated = updateBenefitUsage('amex-uber', 50, 'Used for airport ride')
    
    expect(updated.notes).toBe('Used for airport ride')
    
    // Reset
    updateBenefitUsage('amex-uber', 0, '')
  })
  
  it('preserves existing notes when not provided', () => {
    // First set a note
    updateBenefitUsage('amex-uber', 0, 'Existing note')
    
    // Update usage without changing notes
    const updated = updateBenefitUsage('amex-uber', 25)
    
    expect(updated.notes).toBe('Existing note')
    
    // Reset
    updateBenefitUsage('amex-uber', 0, '')
  })
  
  it('throws error for non-existent benefit', () => {
    expect(() => updateBenefitUsage('non-existent', 100)).toThrow('Benefit not found')
  })
})

describe('toggleActivation', () => {
  it('toggles activation for benefits requiring it', () => {
    const benefit = getBenefitById('amex-uber')
    const original = benefit?.activationAcknowledged ?? false
    
    const updated = toggleActivation('amex-uber')
    expect(updated.activationAcknowledged).toBe(!original)
    
    // Toggle back
    toggleActivation('amex-uber')
  })
  
  it('throws error for benefit without activation', () => {
    expect(() => toggleActivation('chase-travel')).toThrow('does not require activation')
  })
  
  it('throws error for non-existent benefit', () => {
    expect(() => toggleActivation('non-existent')).toThrow('Benefit not found')
  })
})

describe('getStats', () => {
  it('calculates overall statistics', () => {
    const stats = getStats()
    
    expect(stats).toHaveProperty('totalBenefits')
    expect(stats).toHaveProperty('totalValue')
    expect(stats).toHaveProperty('usedValue')
    expect(stats).toHaveProperty('completedCount')
    expect(stats).toHaveProperty('pendingCount')
    expect(stats).toHaveProperty('missedCount')
  })
  
  it('totals match sum of all benefits', () => {
    const stats = getStats()
    const benefits = getBenefits()
    
    expect(stats.totalBenefits).toBe(benefits.length)
    expect(stats.totalValue).toBe(benefits.reduce((sum, b) => sum + b.creditAmount, 0))
  })
  
  it('counts are non-negative integers', () => {
    const stats = getStats()
    
    expect(stats.totalBenefits).toBeGreaterThanOrEqual(0)
    expect(stats.completedCount).toBeGreaterThanOrEqual(0)
    expect(stats.pendingCount).toBeGreaterThanOrEqual(0)
    expect(stats.missedCount).toBeGreaterThanOrEqual(0)
  })
  
  it('used value is less than or equal to total value', () => {
    const stats = getStats()
    
    expect(stats.usedValue).toBeLessThanOrEqual(stats.totalValue)
  })
  
  it('counts sum to total benefits', () => {
    const stats = getStats()
    
    const sum = stats.completedCount + stats.pendingCount + stats.missedCount
    expect(sum).toBe(stats.totalBenefits)
  })
})
