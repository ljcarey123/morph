// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const streamTextMock = vi.fn()
const objectOutputMock = vi.fn()
const createGoogleGenerativeAIMock = vi.fn()
const modelMock = vi.fn()

vi.mock('ai', () => ({
  streamText: streamTextMock,
  Output: { object: objectOutputMock },
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: createGoogleGenerativeAIMock,
}))

const { default: handler } = await import('./generate-ui')

describe('POST /api/generate-ui', () => {
  beforeEach(() => {
    streamTextMock.mockReset()
    objectOutputMock.mockReset()
    createGoogleGenerativeAIMock.mockReset()
    modelMock.mockReset()
    createGoogleGenerativeAIMock.mockReturnValue(modelMock)
  })

  it('returns 401 with no body call when x-user-api-key is missing', async () => {
    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Missing x-user-api-key header' })
    expect(createGoogleGenerativeAIMock).not.toHaveBeenCalled()
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it('returns 401 when x-user-api-key is an empty string', async () => {
    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': '' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(401)
  })

  it('forwards the user API key to the provider and streams the result', async () => {
    const expectedResponse = new Response('stream-body')
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => expectedResponse,
    })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    const response = await handler(req)

    expect(createGoogleGenerativeAIMock).toHaveBeenCalledWith({ apiKey: 'user-supplied-key' })
    expect(streamTextMock).toHaveBeenCalledTimes(1)
    const callArgs = streamTextMock.mock.calls[0]?.[0] as { prompt: string; model: unknown }
    expect(callArgs.prompt).toContain('note text')
    expect(callArgs.prompt).toContain('Timeline')
    expect(response).toBe(expectedResponse)
  })

  it('folds previousCode into the prompt when correcting an existing tab', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream-body'),
    })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({
        content: 'note text',
        direction: 'Make it blue',
        previousCode: '<div class="red"></div>',
      }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { prompt: string }
    expect(callArgs.prompt).toContain('Make it blue')
    expect(callArgs.prompt).toContain('<div class="red"></div>')
  })

  it('never logs or echoes the supplied api key in the response', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('ok'),
    })
    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'super-secret-key' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)
    const bodyText = await response.text()

    expect(bodyText).not.toContain('super-secret-key')
  })
})
