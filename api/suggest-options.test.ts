// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const generateTextMock = vi.fn()
const objectOutputMock = vi.fn()
const createGoogleGenerativeAIMock = vi.fn()
const modelMock = vi.fn()

vi.mock('ai', () => ({
  generateText: generateTextMock,
  Output: { object: objectOutputMock },
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: createGoogleGenerativeAIMock,
}))

const { default: handler } = await import('./suggest-options')

describe('POST /api/suggest-options', () => {
  beforeEach(() => {
    generateTextMock.mockReset()
    objectOutputMock.mockReset()
    createGoogleGenerativeAIMock.mockReset()
    modelMock.mockReset()
    createGoogleGenerativeAIMock.mockReturnValue(modelMock)
  })

  it('returns 401 with no body call when x-user-api-key is missing', async () => {
    const req = new Request('http://localhost/api/suggest-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Missing x-user-api-key header' })
    expect(createGoogleGenerativeAIMock).not.toHaveBeenCalled()
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns 401 when x-user-api-key is an empty string', async () => {
    const req = new Request('http://localhost/api/suggest-options', {
      method: 'POST',
      headers: { 'x-user-api-key': '' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(401)
  })

  it('forwards the user API key to the provider and returns the parsed options', async () => {
    const options = [
      { label: 'Timeline', description: 'A chronological view.' },
      { label: 'Comparison table', description: 'Side-by-side comparison.' },
      { label: 'Mind map', description: 'A radial overview.' },
    ]
    generateTextMock.mockResolvedValue({ output: { options } })

    const req = new Request('http://localhost/api/suggest-options', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)

    expect(createGoogleGenerativeAIMock).toHaveBeenCalledWith({ apiKey: 'user-supplied-key' })
    expect(generateTextMock).toHaveBeenCalledTimes(1)
    const callArgs = generateTextMock.mock.calls[0]?.[0] as { prompt: string }
    expect(callArgs.prompt).toBe('note text')
    expect(await response.json()).toEqual({ options })
  })

  it('never logs or echoes the supplied api key in the response', async () => {
    generateTextMock.mockResolvedValue({ output: { options: [] } })
    const req = new Request('http://localhost/api/suggest-options', {
      method: 'POST',
      headers: { 'x-user-api-key': 'super-secret-key' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)
    const bodyText = await response.text()

    expect(bodyText).not.toContain('super-secret-key')
  })
})
