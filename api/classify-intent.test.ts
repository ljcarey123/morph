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

const { default: handler } = await import('./classify-intent')

describe('POST /api/classify-intent', () => {
  beforeEach(() => {
    generateTextMock.mockReset()
    objectOutputMock.mockReset()
    createGoogleGenerativeAIMock.mockReset()
    modelMock.mockReset()
    createGoogleGenerativeAIMock.mockReturnValue(modelMock)
  })

  it('returns 401 with no body call when x-user-api-key is missing', async () => {
    const req = new Request('http://localhost/api/classify-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'make it blue', currentArtifact: 'Timeline' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Missing x-user-api-key header' })
    expect(createGoogleGenerativeAIMock).not.toHaveBeenCalled()
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns 401 when x-user-api-key is an empty string', async () => {
    const req = new Request('http://localhost/api/classify-intent', {
      method: 'POST',
      headers: { 'x-user-api-key': '' },
      body: JSON.stringify({ message: 'make it blue', currentArtifact: 'Timeline' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(401)
  })

  it('returns 400 when the request body fails validation', async () => {
    const req = new Request('http://localhost/api/classify-intent', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({}),
    })

    const response = await handler(req)

    expect(response.status).toBe(400)
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('forwards the user API key to the provider and returns the classified action', async () => {
    generateTextMock.mockResolvedValue({ output: { action: 'edit' } })

    const req = new Request('http://localhost/api/classify-intent', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ message: 'make it blue', currentArtifact: 'Timeline' }),
    })

    const response = await handler(req)

    expect(createGoogleGenerativeAIMock).toHaveBeenCalledWith({ apiKey: 'user-supplied-key' })
    expect(generateTextMock).toHaveBeenCalledTimes(1)
    const callArgs = generateTextMock.mock.calls[0]?.[0] as { prompt: string; system: string }
    expect(callArgs.prompt).toContain('<current_artifact>\nTimeline\n</current_artifact>')
    expect(callArgs.prompt).toContain('<user_message>\nmake it blue\n</user_message>')
    expect(callArgs.system).toContain('untrusted user-provided data')
    expect(callArgs.system).toContain('Default to "edit"')
    expect(await response.json()).toEqual({ action: 'edit' })
  })

  it('never logs or echoes the supplied api key in the response', async () => {
    generateTextMock.mockResolvedValue({ output: { action: 'create' } })
    const req = new Request('http://localhost/api/classify-intent', {
      method: 'POST',
      headers: { 'x-user-api-key': 'super-secret-key' },
      body: JSON.stringify({ message: 'build a timeline', currentArtifact: 'Budget chart' }),
    })

    const response = await handler(req)
    const bodyText = await response.text()

    expect(bodyText).not.toContain('super-secret-key')
  })
})
