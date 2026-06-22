import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreviewCanvas } from './PreviewCanvas'

describe('PreviewCanvas', () => {
  it('renders an iframe sandboxed to allow-popups only', () => {
    render(<PreviewCanvas code="<p>hi</p>" uiType="html_snippet" />)

    const iframe = screen.getByTitle('Generated UI preview')
    expect(iframe).toHaveAttribute('sandbox', 'allow-popups')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-scripts')
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin')
  })

  it('compiles the provided code into the iframe srcDoc', () => {
    render(<PreviewCanvas code="<p>hi</p>" uiType="html_snippet" />)

    const iframe = screen.getByTitle('Generated UI preview')
    expect(iframe.getAttribute('srcdoc')).toContain('<p>hi</p>')
  })

  it('renders without crashing when code and uiType are undefined', () => {
    render(<PreviewCanvas code={undefined} uiType={undefined} />)

    const iframe = screen.getByTitle('Generated UI preview')
    expect(iframe.getAttribute('srcdoc')).toContain('<body></body>')
  })
})
