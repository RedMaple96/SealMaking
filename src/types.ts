export type TemplateId = 'official' | 'contract' | 'invoice' | 'finance' | 'department'

export type ShapeType = 'circle' | 'ellipse'

export type FontRole = 'song' | 'fangSong' | 'arial'

export type ControlSection = '文本内容' | '结构参数' | '字体参数' | '导出参数'

export type ControlKind = 'text' | 'number' | 'color'

export interface SealConfig {
  color: string
  exportScale: number
  widthMm: number
  heightMm: number
  borderWidthMm: number
  topText: string
  topTextFontFamily: string
  topTextFontSizeMm: number
  topTextInsetMm: number
  topTextAngleDeg: number
  centerSymbolSizeMm: number
  centerSymbolOffsetYMm: number
  bottomText: string
  bottomTextFontFamily: string
  bottomTextFontSizeMm: number
  bottomTextTopFromCenterMm: number
  codeText: string
  codeFontFamily: string
  codeFontSizeMm: number
  codeLetterSpacingMm: number
  codeBottomMarginMm: number
  middleText: string
  middleTextFontFamily: string
  middleTextFontSizeMm: number
  middleTextLetterSpacingMm: number
  middleTextWidthMm: number
  middleTextOffsetYMm: number
  serialText: string
  serialFontFamily: string
  serialFontSizeMm: number
  serialLetterSpacingMm: number
  serialTopFromCenterMm: number
}

export interface ControlDefinition {
  key: keyof SealConfig
  label: string
  section: ControlSection
  kind: ControlKind
  min?: number
  max?: number
  step?: number
  placeholder?: string
  help?: string
}

export interface TemplatePreset {
  id: TemplateId
  name: string
  summary: string
  notes: string[]
  shape: ShapeType
  showStar: boolean
  showCode: boolean
  showBottomText: boolean
  showMiddleText: boolean
  showSerialText: boolean
  defaults: SealConfig
  controls: ControlDefinition[]
}
