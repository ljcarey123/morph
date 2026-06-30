import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreviewCanvas } from './PreviewCanvas'

describe('PreviewCanvas', () => {
  it('renders an iframe sandboxed to allow-popups and allow-scripts, but never allow-same-origin', () => {
    render(<PreviewCanvas noteId="note-1" tabId="tab-1" code="<p>hi</p>" uiType="html_snippet" />)

    const iframe = screen.getByTitle('Generated UI preview')
    expect(iframe).toHaveAttribute('sandbox', 'allow-popups allow-scripts')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin')
  })

  it('compiles the provided code into the iframe srcDoc', () => {
    render(<PreviewCanvas noteId="note-1" tabId="tab-1" code="<p>hi</p>" uiType="html_snippet" />)

    const iframe = screen.getByTitle('Generated UI preview')
    expect(iframe.getAttribute('srcdoc')).toContain('<p>hi</p>')
  })

  it('renders without crashing when code and uiType are undefined', () => {
    render(
      <PreviewCanvas noteId="note-1" tabId="tab-1" code={undefined} uiType={undefined} />,
    )

    const iframe = screen.getByTitle('Generated UI preview')
    expect(iframe.getAttribute('srcdoc')).toContain('<body><script>')
  })
})
