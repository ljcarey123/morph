// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { branchOutputSchema } from '../src/schemas/generativeUi'

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
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
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
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
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

  it('canvas style includes morph-tabs and morph-tooltip docs but forbids raw scripts', async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('stream-body') })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline', style: 'canvas' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
    expect(callArgs.system).toContain('morph-tabs')
    expect(callArgs.system).toContain('morph-tooltip')
    expect(callArgs.system).toContain('default-tab')
    expect(callArgs.system).not.toContain('No interactivity')
  })

  it('simple style uses a stripped prompt — no morph-* components', async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('stream-body') })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Reference card', style: 'simple' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
    expect(callArgs.system).toContain('No interactivity')
    expect(callArgs.system).not.toContain('INTERACTIVE COMPONENTS')
    expect(callArgs.system).not.toContain('morph-tabs')
  })

  it('defaults to canvas style when style is omitted', async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('stream-body') })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
    expect(callArgs.system).toContain('morph-tabs')
  })

  it('mandates stable ids, viewport sizing, and visual style rules in both styles', async () => {
    for (const style of ['simple', 'canvas'] as const) {
      streamTextMock.mockReset()
      streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('') })

      const req = new Request('http://localhost/api/generate-ui', {
        method: 'POST',
        headers: { 'x-user-api-key': 'user-supplied-key' },
        body: JSON.stringify({ content: 'note text', direction: 'Build a view', style }),
      })

      await handler(req)

      const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
      expect(callArgs.system).toContain('stable, unique kebab-case id')
      expect(callArgs.system).toContain('600px')
      expect(callArgs.system).toContain('complete markup for the entire view')
    }
  })

  it('never logs or echoes the supplied api key in the response', async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('ok') })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'super-secret-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    const response = await handler(req)
    const bodyText = await response.text()

    expect(bodyText).not.toContain('super-secret-key')
  })

  it('returns 400 when the request body fails validation', async () => {
    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text' }),
    })

    const response = await handler(req)

    expect(response.status).toBe(400)
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it('constrains output to a schema where code is mandatory', async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('stream-body') })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    await handler(req)

    expect(objectOutputMock).toHaveBeenCalledWith({ schema: branchOutputSchema })
  })

  it('wraps untrusted fields in delimiter tags and warns the model not to follow them', async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response('stream-body') })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { prompt: string; system: string }
    expect(callArgs.prompt).toContain('<note_content>')
    expect(callArgs.prompt).toContain('<user_direction>')
    expect(callArgs.system).toContain('untrusted user-provided data')
  })
})
