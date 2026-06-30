// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { branchOutputSchema, editOutputSchema } from '../src/schemas/generativeUi'

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
    expect(callArgs.prompt).toContain('Mode: branch')
    expect(callArgs.prompt).toContain('Previous code to correct or expand on')
  })

  it('frames the prompt as a targeted refinement when mode is edit', async () => {
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
        mode: 'edit',
      }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { prompt: string; system: string }
    expect(callArgs.prompt).toContain('Mode: edit')
    expect(callArgs.prompt).toContain('Existing view to refine')
    expect(callArgs.prompt).not.toContain('Previous code to correct or expand on')
    expect(callArgs.system).toContain('Always respond with a patch')
    expect(callArgs.system).toContain(
      'Never drop, blank out, collapse, or replace untouched sections',
    )
    expect(callArgs.system).not.toContain('complete, self-contained markup for the ENTIRE view')
  })

  it('uses a dedicated branch-mode system prompt that never mentions the edit patch shape', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream-body'),
    })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
    expect(callArgs.system).toContain('stable, descriptive, kebab-case id attribute')
    expect(callArgs.system).toContain('complete, self-contained markup for the ENTIRE view')
    expect(callArgs.system).not.toContain('Always respond with a patch')
    expect(callArgs.system).not.toContain('SMALLEST element')
  })

  it('mandates stable ids on generated elements and explains the edit-mode patch option', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream-body'),
    })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Make it blue', mode: 'edit' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
    expect(callArgs.system).toContain('stable, descriptive, kebab-case id attribute')
    expect(callArgs.system).toContain('target_id')
    expect(callArgs.system).toContain('replacement_html')
  })

  it('never logs or echoes the supplied api key in the response', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('ok'),
    })
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

  it('constrains branch-mode output to a schema where code is mandatory, not optional', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream-body'),
    })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    await handler(req)

    expect(objectOutputMock).toHaveBeenCalledWith({ schema: branchOutputSchema })
  })

  it('constrains edit-mode output to a schema where target_id/replacement_html are mandatory', async () => {
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
        mode: 'edit',
      }),
    })

    await handler(req)

    expect(objectOutputMock).toHaveBeenCalledWith({ schema: editOutputSchema })
  })

  it('enforces no-interactivity rule and does not include morph-* component docs', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream-body'),
    })

    const req = new Request('http://localhost/api/generate-ui', {
      method: 'POST',
      headers: { 'x-user-api-key': 'user-supplied-key' },
      body: JSON.stringify({ content: 'note text', direction: 'Timeline' }),
    })

    await handler(req)

    const callArgs = streamTextMock.mock.calls[0]?.[0] as { system: string }
    expect(callArgs.system).toContain('No interactivity')
    expect(callArgs.system).not.toContain('morph-toggle')
    expect(callArgs.system).not.toContain('morph-tabs')
    expect(callArgs.system).not.toContain('data-state-key')
  })

  it('wraps untrusted fields in delimiter tags and warns the model not to follow them', async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () => new Response('stream-body'),
    })

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
