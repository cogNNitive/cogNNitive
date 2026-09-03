import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleGroupWidget from '../../src/shared/widgets/ToggleGroupWidget.vue'
import CycleWidget from '../../src/shared/widgets/CycleWidget.vue'
import CodeWidget from '../../src/shared/widgets/CodeWidget.vue'
import MermaidWidget from '../../src/shared/widgets/MermaidWidget.vue'
import DiagramWidget from '../../src/shared/widgets/DiagramWidget.vue'
import TimestampWidget from '../../src/shared/widgets/TimestampWidget.vue'
import MarkdownWidget from '../../src/shared/widgets/MarkdownWidget.vue'
import DateWidget from '../../src/shared/widgets/DateWidget.vue'
import UrlWidget from '../../src/shared/widgets/UrlWidget.vue'
import ColorWidget from '../../src/shared/widgets/ColorWidget.vue'
import MultiSelectWidget from '../../src/shared/widgets/MultiSelectWidget.vue'
import TagsWidget from '../../src/shared/widgets/TagsWidget.vue'
import RatingWidget from '../../src/shared/widgets/RatingWidget.vue'
import ScaleWidget from '../../src/shared/widgets/ScaleWidget.vue'
import { resolveWidgetComponent } from '../../src/shared/widgets'

// ---------------------------------------------------------------------------
// C.8 ToggleGroupWidget
// ---------------------------------------------------------------------------
describe('ToggleGroupWidget (C.8)', () => {
  const fieldDef = { name: 'priority', type: 'togglegroup', options: ['low', 'medium', 'high'] }

  it('renders all options as segment buttons', () => {
    const wrapper = mount(ToggleGroupWidget, {
      props: { modelValue: 'medium', fieldDefinition: fieldDef },
    })
    const btns = wrapper.findAll('button')
    expect(btns).toHaveLength(3)
    expect(btns[0].text()).toBe('low')
    expect(btns[1].text()).toBe('medium')
    expect(btns[2].text()).toBe('high')
  })

  it('highlights the active segment', () => {
    const wrapper = mount(ToggleGroupWidget, {
      props: { modelValue: 'medium', fieldDefinition: fieldDef },
    })
    const btns = wrapper.findAll('button')
    expect(btns[1].classes()).toContain('widget-togglegroup-btn--active')
    expect(btns[0].classes()).not.toContain('widget-togglegroup-btn--active')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(ToggleGroupWidget, {
      props: { modelValue: 'medium', fieldDefinition: fieldDef },
    })
    await wrapper.findAll('button')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['high'])
  })

  it('does not emit on click in readonly mode', async () => {
    const wrapper = mount(ToggleGroupWidget, {
      props: { modelValue: 'medium', fieldDefinition: fieldDef, readonly: true },
    })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('renders dash when no options', () => {
    const wrapper = mount(ToggleGroupWidget, { props: { modelValue: '' } })
    expect(wrapper.text()).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// C.9 CycleWidget
// ---------------------------------------------------------------------------
describe('CycleWidget (C.9)', () => {
  it('renders current value as a pill', () => {
    const wrapper = mount(CycleWidget, {
      props: {
        modelValue: 'draft',
        fieldDefinition: { name: 'status', type: 'cycle', options: ['draft', 'review', 'final'] },
      },
    })
    expect(wrapper.find('button').text()).toBe('draft')
  })

  it('advances to next option on click', async () => {
    const wrapper = mount(CycleWidget, {
      props: {
        modelValue: 'draft',
        fieldDefinition: { name: 'status', type: 'cycle', options: ['draft', 'review', 'final'] },
      },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['review'])
  })

  it('wraps around after last option', async () => {
    const wrapper = mount(CycleWidget, {
      props: {
        modelValue: 'final',
        fieldDefinition: { name: 'status', type: 'cycle', options: ['draft', 'review', 'final'] },
      },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['draft'])
  })

  it('does not advance in readonly mode', async () => {
    const wrapper = mount(CycleWidget, {
      props: {
        modelValue: 'draft',
        fieldDefinition: { name: 'status', type: 'cycle', options: ['draft', 'review', 'final'] },
        readonly: true,
      },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('renders fallback when no options', () => {
    const wrapper = mount(CycleWidget, { props: { modelValue: '' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// C.10 CodeWidget
// ---------------------------------------------------------------------------
describe('CodeWidget (C.10)', () => {
  it('renders code in a <pre><code> block in read mode', () => {
    const wrapper = mount(CodeWidget, {
      props: {
        modelValue: '{"key": "value"}',
        readonly: true,
        fieldDefinition: { name: 'config', type: 'json' },
      },
    })
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('code').text()).toBe('{"key": "value"}')
  })

  it('shows language badge in read mode', () => {
    const wrapper = mount(CodeWidget, {
      props: {
        modelValue: '{"key": "value"}',
        readonly: true,
        fieldDefinition: { name: 'config', type: 'json' },
      },
    })
    const badge = wrapper.find('.widget-code-lang-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('json')
  })

  it('renders monospace textarea with gutter in edit mode', () => {
    const wrapper = mount(CodeWidget, { props: { modelValue: 'line1\nline2\nline3' } })
    expect(wrapper.find('textarea').exists()).toBe(true)
    const gutterLines = wrapper.findAll('.widget-code-gutter-line')
    expect(gutterLines).toHaveLength(3)
    expect(gutterLines[0].text()).toBe('1')
    expect(gutterLines[2].text()).toBe('3')
  })

  it('emits update:modelValue on textarea input', async () => {
    const wrapper = mount(CodeWidget, { props: { modelValue: 'hello' } })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('world')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['world'])
  })

  it('renders empty pre in read mode when no value', () => {
    const wrapper = mount(CodeWidget, { props: { modelValue: '', readonly: true } })
    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('code').text()).toBe('')
  })
})

// ---------------------------------------------------------------------------
// C.11 MermaidWidget
// ---------------------------------------------------------------------------
describe('MermaidWidget (C.11)', () => {
  it('renders textarea in edit mode', () => {
    const wrapper = mount(MermaidWidget, { props: { modelValue: 'graph TD; A-->B;' } })
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('graph TD; A-->B;')
  })

  it('emits update:modelValue on textarea input', async () => {
    const wrapper = mount(MermaidWidget, { props: { modelValue: 'graph TD; A-->B;' } })
    await wrapper.find('textarea').setValue('graph TD; A-->C;')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['graph TD; A-->C;'])
  })

  it('shows hint text in edit mode', () => {
    const wrapper = mount(MermaidWidget, { props: { modelValue: '' } })
    expect(wrapper.text()).toContain('Ctrl+Enter')
  })

  it('shows empty state in read mode when no value', () => {
    const wrapper = mount(MermaidWidget, { props: { modelValue: '', readonly: true } })
    expect(wrapper.text()).toBe('—')
  })

  it('renders a diagram container in read mode with value', () => {
    const wrapper = mount(MermaidWidget, {
      props: { modelValue: 'graph TD; A-->B;', readonly: true },
    })
    expect(wrapper.find('.widget-mermaid-display').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// C.12 DiagramWidget
// ---------------------------------------------------------------------------
describe('DiagramWidget (C.12)', () => {
  it('renders inline SVG from DSL in read mode', () => {
    const wrapper = mount(DiagramWidget, {
      props: { modelValue: 'Plan > Execute > Review', readonly: true },
    })
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    // SVG should contain text elements for each box
    expect(svg.text()).toContain('Plan')
    expect(svg.text()).toContain('Execute')
    expect(svg.text()).toContain('Review')
  })

  it('renders textarea in edit mode', () => {
    const wrapper = mount(DiagramWidget, { props: { modelValue: 'Plan > Execute' } })
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Plan > Execute')
  })

  it('emits update:modelValue on textarea input', async () => {
    const wrapper = mount(DiagramWidget, { props: { modelValue: 'A > B' } })
    await wrapper.find('textarea').setValue('A > C')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['A > C'])
  })

  it('shows empty state in read mode when no value', () => {
    const wrapper = mount(DiagramWidget, { props: { modelValue: '', readonly: true } })
    expect(wrapper.text()).toBe('—')
  })

  it('renders empty SVG when no DSL but has value', () => {
    const wrapper = mount(DiagramWidget, { props: { modelValue: 'Test', readonly: true } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// C.13 TimestampWidget
// ---------------------------------------------------------------------------
describe('TimestampWidget (C.13)', () => {
  it('renders locale-formatted datetime in read mode', () => {
    const wrapper = mount(TimestampWidget, {
      props: { modelValue: '2025-06-15T14:30:00Z', readonly: true },
    })
    expect(wrapper.text()).toContain('Jun 15, 2025')
    expect(wrapper.text()).toContain('2025')
  })

  it('renders datetime-local input in edit mode', () => {
    const wrapper = mount(TimestampWidget, { props: { modelValue: '2025-06-15T14:30:00Z' } })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('datetime-local')
  })

  it('emits update:modelValue on input change', async () => {
    const wrapper = mount(TimestampWidget, { props: { modelValue: '2025-06-15T14:30:00Z' } })
    const input = wrapper.find('input')
    await input.setValue('2025-06-16T10:00')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('renders fallback text for invalid dates', () => {
    const wrapper = mount(TimestampWidget, { props: { modelValue: 'not-a-date', readonly: true } })
    expect(wrapper.text()).toContain('not-a-date')
  })

  it('renders dash for empty value', () => {
    const wrapper = mount(TimestampWidget, { props: { modelValue: '', readonly: true } })
    expect(wrapper.text()).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// C.14 MarkdownWidget
// ---------------------------------------------------------------------------
describe('MarkdownWidget (C.14)', () => {
  it('renders markdown via marked in read mode', () => {
    const wrapper = mount(MarkdownWidget, {
      props: { modelValue: '**bold** and *italic*', readonly: true },
    })
    expect(wrapper.html()).toContain('<strong>bold</strong>')
    expect(wrapper.html()).toContain('<em>italic</em>')
  })

  it('renders editor component in edit mode', () => {
    const wrapper = mount(MarkdownWidget, { props: { modelValue: '# Hello' } })
    expect(wrapper.find('.minimal-markdown-editor').exists()).toBe(true)
  })

  it('shows formatting toolbar in edit mode', () => {
    const wrapper = mount(MarkdownWidget, { props: { modelValue: 'test' } })
    const toolbar = wrapper.find('.widget-markdown-toolbar')
    expect(toolbar.exists()).toBe(true)
    const btns = toolbar.findAll('button')
    expect(btns.length).toBeGreaterThanOrEqual(4)
  })

  it('shows empty state in read mode when no value', () => {
    const wrapper = mount(MarkdownWidget, { props: { modelValue: '', readonly: true } })
    expect(wrapper.text()).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// C.1 DateWidget (regression test)
// ---------------------------------------------------------------------------
describe('DateWidget (C.1)', () => {
  it('renders date picker in edit mode', () => {
    const wrapper = mount(DateWidget, { props: { modelValue: '2025-06-15' } })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('date')
    expect((input.element as HTMLInputElement).value).toBe('2025-06-15')
  })

  it('emits update:modelValue on date change', async () => {
    const wrapper = mount(DateWidget, { props: { modelValue: '2025-06-15' } })
    await wrapper.find('input').setValue('2025-06-16')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2025-06-16'])
  })

  it('renders formatted date in read mode', () => {
    const wrapper = mount(DateWidget, { props: { modelValue: '2025-06-15', readonly: true } })
    expect(wrapper.text()).toContain('Jun 15, 2025')
  })
})

// ---------------------------------------------------------------------------
// C.2 UrlWidget (regression test)
// ---------------------------------------------------------------------------
describe('UrlWidget (C.2)', () => {
  it('renders clickable link in read mode', () => {
    const wrapper = mount(UrlWidget, {
      props: { modelValue: 'https://example.com', readonly: true },
    })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('renders URL input in edit mode', () => {
    const wrapper = mount(UrlWidget, { props: { modelValue: 'https://example.com' } })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('url')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(UrlWidget, { props: { modelValue: 'https://example.com' } })
    await wrapper.find('input').setValue('https://other.com')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['https://other.com'])
  })
})

// ---------------------------------------------------------------------------
// C.3 ColorWidget (regression test)
// ---------------------------------------------------------------------------
describe('ColorWidget (C.3)', () => {
  it('renders color swatch and hex text in read mode', () => {
    const wrapper = mount(ColorWidget, { props: { modelValue: '#4D0E4E', readonly: true } })
    expect(wrapper.find('.widget-color-swatch').exists()).toBe(true)
    expect(wrapper.text()).toContain('#4D0E4E')
  })

  it('renders color picker in edit mode', () => {
    const wrapper = mount(ColorWidget, { props: { modelValue: '#4D0E4E' } })
    expect(wrapper.find('input[type="color"]').exists()).toBe(true)
  })

  it('emits update:modelValue on color change', async () => {
    const wrapper = mount(ColorWidget, { props: { modelValue: '#000000' } })
    await wrapper.find('input[type="color"]').setValue('#ffffff')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#ffffff'])
  })
})

// ---------------------------------------------------------------------------
// C.4 MultiSelectWidget (regression test)
// ---------------------------------------------------------------------------
describe('MultiSelectWidget (C.4)', () => {
  const fieldDef = { name: 'langs', type: 'multiselect', options: ['js', 'ts', 'py', 'go'] }

  it('renders selected chips in read mode', () => {
    const wrapper = mount(MultiSelectWidget, {
      props: { modelValue: ['js', 'ts'], fieldDefinition: fieldDef, readonly: true },
    })
    expect(wrapper.text()).toContain('js')
    expect(wrapper.text()).toContain('ts')
    expect(wrapper.text()).not.toContain('py')
  })

  it('renders removable chips with unselected dropdown in edit mode', () => {
    const wrapper = mount(MultiSelectWidget, {
      props: { modelValue: ['js', 'ts'], fieldDefinition: fieldDef },
    })
    const removeBtns = wrapper.findAll('.widget-multiselect-chip-remove')
    expect(removeBtns).toHaveLength(2)
    expect(wrapper.find('.widget-multiselect-trigger').exists()).toBe(true)
  })

  it('emits update:modelValue when removing a chip', async () => {
    const wrapper = mount(MultiSelectWidget, {
      props: { modelValue: ['js', 'ts'], fieldDefinition: fieldDef },
    })
    await wrapper.findAll('.widget-multiselect-chip-remove')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['ts']])
  })
})

// ---------------------------------------------------------------------------
// C.5 TagsWidget (regression test)
// ---------------------------------------------------------------------------
describe('TagsWidget (C.5)', () => {
  it('renders tags as chips in read mode', () => {
    const wrapper = mount(TagsWidget, {
      props: { modelValue: ['frontend', 'vue'], readonly: true },
    })
    expect(wrapper.text()).toContain('frontend')
    expect(wrapper.text()).toContain('vue')
  })

  it('emits update:modelValue when adding tag via Enter', async () => {
    const wrapper = mount(TagsWidget, { props: { modelValue: ['frontend'] } })
    const input = wrapper.find('input')
    await input.setValue('router')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['frontend', 'router']])
  })

  it('emits update:modelValue when removing a tag', async () => {
    const wrapper = mount(TagsWidget, { props: { modelValue: ['frontend', 'vue'] } })
    await wrapper.findAll('.widget-tags-chip-remove')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['vue']])
  })
})

// ---------------------------------------------------------------------------
// C.6 RatingWidget (regression test)
// ---------------------------------------------------------------------------
describe('RatingWidget (C.6)', () => {
  it('renders filled and empty stars', () => {
    const wrapper = mount(RatingWidget, { props: { modelValue: 3 } })
    const stars = wrapper.findAll('.widget-rating-star')
    expect(stars).toHaveLength(5)
    expect(stars[0].classes()).toContain('widget-rating-star--filled')
    expect(stars[3].classes()).toContain('widget-rating-star--empty')
  })

  it('shows n/5 text', () => {
    const wrapper = mount(RatingWidget, { props: { modelValue: 3 } })
    expect(wrapper.text()).toContain('3/5')
  })

  it('emits update:modelValue on star click', async () => {
    const wrapper = mount(RatingWidget, { props: { modelValue: 1 } })
    await wrapper.findAll('.widget-rating-star')[4].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([5])
  })
})

// ---------------------------------------------------------------------------
// C.7 ScaleWidget (regression test)
// ---------------------------------------------------------------------------
describe('ScaleWidget (C.7)', () => {
  it('renders step indicators with active highlight', () => {
    const wrapper = mount(ScaleWidget, { props: { modelValue: 7 } })
    const steps = wrapper.findAll('.widget-scale-step')
    expect(steps.length).toBe(10) // default 1-10
    expect(steps[6].classes()).toContain('widget-scale-step--active')
  })

  it('shows badge with current value', () => {
    const wrapper = mount(ScaleWidget, { props: { modelValue: 7 } })
    expect(wrapper.find('.widget-scale-badge').text()).toBe('7')
  })

  it('emits update:modelValue on step click', async () => {
    const wrapper = mount(ScaleWidget, { props: { modelValue: 1 } })
    await wrapper.findAll('.widget-scale-step')[5].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6])
  })

  it('respects custom range from fieldDefinition.options', () => {
    const wrapper = mount(ScaleWidget, {
      props: {
        modelValue: 2,
        fieldDefinition: { name: 'score', type: 'scale', options: ['1', '2', '3', '4', '5'] },
      },
    })
    expect(wrapper.findAll('.widget-scale-step')).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// C.15 Registry Resolution
// ---------------------------------------------------------------------------
describe('widget registry: all 14 new types resolve (C.15)', () => {
  it('resolves all 14 new widget types', () => {
    expect(resolveWidgetComponent('date')).toBeTruthy()
    expect(resolveWidgetComponent('url')).toBeTruthy()
    expect(resolveWidgetComponent('color')).toBeTruthy()
    expect(resolveWidgetComponent('multiselect')).toBeTruthy()
    expect(resolveWidgetComponent('tags')).toBeTruthy()
    expect(resolveWidgetComponent('rating')).toBeTruthy()
    expect(resolveWidgetComponent('scale')).toBeTruthy()
    expect(resolveWidgetComponent('togglegroup')).toBeTruthy()
    expect(resolveWidgetComponent('cycle')).toBeTruthy()
    expect(resolveWidgetComponent('code')).toBeTruthy()
    expect(resolveWidgetComponent('mermaid')).toBeTruthy()
    expect(resolveWidgetComponent('diagram')).toBeTruthy()
    expect(resolveWidgetComponent('timestamp')).toBeTruthy()
    expect(resolveWidgetComponent('markdown')).toBeTruthy()
  })

  it('returns undefined for unregistered type', () => {
    expect(resolveWidgetComponent('unknown-type')).toBeUndefined()
  })

  it('existing types still resolve correctly', () => {
    expect(resolveWidgetComponent('text')).toBeTruthy()
    expect(resolveWidgetComponent('string')).toBeTruthy()
    expect(resolveWidgetComponent('image')).toBeTruthy()
    expect(resolveWidgetComponent('number')).toBeTruthy()
    expect(resolveWidgetComponent('boolean')).toBeTruthy()
  })
})
