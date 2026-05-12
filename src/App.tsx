import { useMemo, useRef, useState } from 'react'
import './App.css'
import { downloadSealPng } from './export'
import { SealRenderer } from './sealRenderer'
import { createTemplateConfig, templateList, templatePresets } from './templates'
import type { ControlDefinition, SealConfig, TemplateId } from './types'

type DownloadStatus = 'idle' | 'working' | 'done' | 'error'
const SECTION_ORDER = ['导出参数', '文本内容', '结构参数'] as const

/** 按配置分组控件，便于面板按区块渲染。 */
function groupControls(controls: ControlDefinition[]) {
  const sections: Record<string, ControlDefinition[]> = {}

  for (const control of controls) {
    if (!sections[control.section]) {
      sections[control.section] = []
    }

    sections[control.section].push(control)
  }

  return sections
}

/** 按既定顺序输出分组，避免界面顺序受配置声明顺序影响。 */
function sortGroupedControls(sections: Record<string, ControlDefinition[]>) {
  return Object.entries(sections).sort(([left], [right]) => {
    const leftIndex = SECTION_ORDER.indexOf(left as (typeof SECTION_ORDER)[number])
    const rightIndex = SECTION_ORDER.indexOf(right as (typeof SECTION_ORDER)[number])

    const normalizedLeftIndex = leftIndex === -1 ? SECTION_ORDER.length : leftIndex
    const normalizedRightIndex = rightIndex === -1 ? SECTION_ORDER.length : rightIndex

    return normalizedLeftIndex - normalizedRightIndex
  })
}

/** 根据控件类型解析用户输入，并写回当前配置。 */
function updateConfigValue(
  previousConfig: SealConfig,
  control: ControlDefinition,
  rawValue: string,
): SealConfig {
  if (control.kind === 'number') {
    const numericValue = Number(rawValue)
    if (Number.isNaN(numericValue)) {
      return previousConfig
    }

    return {
      ...previousConfig,
      [control.key]: numericValue,
    }
  }

  return {
    ...previousConfig,
    [control.key]: rawValue,
  }
}

/** 生成适合下载文件名的模板名称。 */
function getFileName(templateId: TemplateId): string {
  return `seal-${templateId}.png`
}

/** 格式化滑动条当前值，便于右侧显示。 */
function formatControlValue(value: string | number) {
  return typeof value === 'number' ? `${value}` : value
}

/** 渲染单个配置控件。 */
function ControlField({
  control,
  value,
  onChange,
}: {
  control: ControlDefinition
  value: string | number
  onChange: (nextValue: string) => void
}) {
  if (control.kind === 'number') {
    return (
      <label className="control-field slider-field">
        <div className="control-topline">
          <span className="control-label">{control.label}</span>
          <strong className="control-value">{formatControlValue(value)}</strong>
        </div>
        <input
          type="range"
          value={String(value)}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="slider-meta">
          <span>{control.min ?? 0}</span>
          <span>{control.max ?? 0}</span>
        </div>
        {control.help ? <small>{control.help}</small> : null}
      </label>
    )
  }

  return (
    <label className="control-field">
      <span className="control-label">{control.label}</span>
      <input
        type={control.kind}
        value={String(value)}
        min={control.min}
        max={control.max}
        step={control.step}
        placeholder={control.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {control.help ? <small>{control.help}</small> : null}
    </label>
  )
}

/** 应用主界面，负责模板切换、参数编辑与透明 PNG 导出。 */
function App() {
  const [templateId, setTemplateId] = useState<TemplateId>('official')
  const [config, setConfig] = useState<SealConfig>(() => createTemplateConfig('official'))
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [downloadMessage, setDownloadMessage] = useState('透明背景 PNG 已就绪')
  const svgRef = useRef<SVGSVGElement | null>(null)

  const currentPreset = templatePresets[templateId]
  const visibleControls = useMemo(
    () => currentPreset.controls.filter((control) => control.section !== '字体参数'),
    [currentPreset.controls],
  )
  const groupedControls = useMemo(() => groupControls(visibleControls), [visibleControls])

  /** 切换模板并重置为对应的规范默认值。 */
  function handleTemplateChange(nextTemplateId: TemplateId) {
    setTemplateId(nextTemplateId)
    setConfig(createTemplateConfig(nextTemplateId))
    setDownloadStatus('idle')
    setDownloadMessage('已切换模板默认参数')
  }

  /** 更新某一项可编辑参数。 */
  function handleControlChange(control: ControlDefinition, rawValue: string) {
    setConfig((previousConfig) => updateConfigValue(previousConfig, control, rawValue))
    setDownloadStatus('idle')
  }

  /** 将当前模板参数恢复为规范预设。 */
  function handleReset() {
    setConfig(createTemplateConfig(templateId))
    setDownloadStatus('idle')
    setDownloadMessage('已恢复模板默认参数')
  }

  /** 导出当前印章为透明背景 PNG 文件。 */
  async function handleDownload() {
    if (!svgRef.current) {
      setDownloadStatus('error')
      setDownloadMessage('当前印章尚未渲染完成')
      return
    }

    setDownloadStatus('working')
    setDownloadMessage('正在生成透明 PNG...')

    try {
      await downloadSealPng(svgRef.current, getFileName(templateId), config.exportScale)
      setDownloadStatus('done')
      setDownloadMessage('透明背景 PNG 下载成功')
    } catch (error) {
      const message = error instanceof Error ? error.message : '透明 PNG 下载失败'
      setDownloadStatus('error')
      setDownloadMessage(message)
    }
  }

  return (
    <div className="app-shell">
      <main className="workspace">
        <aside className="panel template-panel">
          <div className="panel-head">
            <h2>模板选择</h2>
            <p>切换模板后会自动带入对应的规范默认参数。</p>
          </div>
          <label className="template-select-field">
            <span className="control-label">印章模板</span>
            <select value={templateId} onChange={(event) => handleTemplateChange(event.target.value as TemplateId)}>
              {templateList.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <div className="template-summary-card">
            <strong>{currentPreset.name}</strong>
            <p>{currentPreset.summary}</p>
            <span>{currentPreset.notes.join(' / ')}</span>
          </div>
        </aside>

        <section className="panel preview-panel">
          <div className="panel-head">
            <h2>印章预览</h2>
            <p>SVG 为唯一渲染源，预览与导出保持一致。</p>
          </div>
          <div className="preview-meta">
            <span>{currentPreset.summary}</span>
            <span>
              {config.widthMm}mm x {config.heightMm}mm
            </span>
            <span>颜色 {config.color.toUpperCase()}</span>
          </div>
          <div className="seal-stage">
            <div className="seal-paper">
              <SealRenderer config={config} preset={currentPreset} svgRef={svgRef} />
            </div>
          </div>
          <div className="preview-actions">
            <button type="button" className="secondary-btn" onClick={handleReset}>
              恢复模板默认值
            </button>
            <button type="button" className="primary-btn" onClick={handleDownload}>
              下载透明 PNG
            </button>
          </div>
          <p className={`status-line ${downloadStatus}`}>{downloadMessage}</p>
          <ul className="rule-list">
            {currentPreset.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <aside className="panel controls-panel">
          <div className="panel-head">
            <h2>参数编辑</h2>
            <p>文本内容保留输入框，数值类参数统一改为滑动条调节。</p>
          </div>
          {sortGroupedControls(groupedControls).map(([sectionName, controls]) => (
            <section key={sectionName} className="controls-group">
              <div className="group-title">
                <h3>{sectionName}</h3>
              </div>
              <div className="controls-list">
                {controls.map((control) => (
                  <ControlField
                    key={control.key}
                    control={control}
                    value={config[control.key]}
                    onChange={(nextValue) => handleControlChange(control, nextValue)}
                  />
                ))}
              </div>
            </section>
          ))}
        </aside>
      </main>
    </div>
  )
}

export default App
