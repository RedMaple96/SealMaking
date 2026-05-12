import type { RefObject } from 'react'
import type { SealConfig, TemplatePreset } from './types'

interface SealRendererProps {
  config: SealConfig
  preset: TemplatePreset
  svgRef: RefObject<SVGSVGElement | null>
}

/** 计算五角星路径点，保证缩放后仍保持标准比例。 */
function getStarPoints(centerX: number, centerY: number, diameter: number): string {
  const outerRadius = diameter / 2
  const innerRadius = outerRadius * 0.382
  const points: string[] = []

  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const angle = -90 + index * 36
    const radian = (angle * Math.PI) / 180
    const pointX = centerX + Math.cos(radian) * radius
    const pointY = centerY + Math.sin(radian) * radius
    points.push(`${pointX.toFixed(3)},${pointY.toFixed(3)}`)
  }

  return points.join(' ')
}

/** 计算椭圆弧线上每个字符的位置与切线角度。 */
function getGlyphWidthMm(char: string, fontSizeMm: number) {
  if (/[\u4e00-\u9fff]/.test(char)) {
    return fontSizeMm * 0.92
  }

  if (/[A-Z0-9]/.test(char)) {
    return fontSizeMm * 0.62
  }

  if (/[a-z]/.test(char)) {
    return fontSizeMm * 0.54
  }

  return fontSizeMm * 0.45
}

/** 按字符宽度与总弧长精确分配上环文字位置。 */
function getArcGlyphLayout(
  text: string,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  angleDeg: number,
  fontSizeMm: number,
) {
  if (text.length === 0) {
    return []
  }

  const glyphWidths = Array.from(text, (char) => getGlyphWidthMm(char, fontSizeMm))
  const meanRadius = (radiusX + radiusY) / 2
  const arcLength = (angleDeg * Math.PI * meanRadius) / 180
  const totalGlyphWidth = glyphWidths.reduce((sum, width) => sum + width, 0)
  const gapCount = Math.max(text.length - 1, 1)
  const extraSpacing = text.length === 1 ? 0 : Math.max((arcLength - totalGlyphWidth) / gapCount, 0)
  const occupiedLength =
    totalGlyphWidth + (text.length === 1 ? 0 : extraSpacing * Math.max(text.length - 1, 0))
  let cursor = -occupiedLength / 2

  return Array.from(text).map((char, index) => {
    const glyphWidth = glyphWidths[index]
    cursor += glyphWidth / 2
    const currentAngle = -90 + (cursor / meanRadius) * (180 / Math.PI)
    const radian = (currentAngle * Math.PI) / 180
    const x = centerX + radiusX * Math.cos(radian)
    const y = centerY + radiusY * Math.sin(radian)
    const tangentX = -radiusX * Math.sin(radian)
    const tangentY = radiusY * Math.cos(radian)
    const rotation = (Math.atan2(tangentY, tangentX) * 180) / Math.PI
    cursor += glyphWidth / 2 + extraSpacing

    return {
      char,
      x,
      y,
      rotation,
      width: glyphWidth,
    }
  })
}

/** 计算底部编码在圆章内弧上的逐字位置与旋转角度。 */
function getBottomArcCodeLayout(
  text: string,
  centerX: number,
  centerY: number,
  radius: number,
  glyphCenterDistanceMm: number,
) {
  if (text.length === 0) {
    return []
  }

  const stepRadian = text.length === 1 ? 0 : glyphCenterDistanceMm / radius
  const totalSpan = stepRadian * Math.max(text.length - 1, 0)
  const startAngle = Math.PI / 2 + totalSpan / 2

  return Array.from(text).map((char, index) => {
    const currentAngle = startAngle - stepRadian * index
    const x = centerX + radius * Math.cos(currentAngle)
    const y = centerY + radius * Math.sin(currentAngle)
    const rotation = (currentAngle * 180) / Math.PI - 90

    return {
      char,
      x,
      y,
      rotation,
    }
  })
}

/** 依据模板参数渲染上环文字，避免 `textPath` 在不同浏览器中出现位置漂移。 */
function ArcText({
  config,
  widthMm,
  heightMm,
}: {
  config: SealConfig
  widthMm: number
  heightMm: number
}) {
  const centerX = widthMm / 2
  const centerY = heightMm / 2
  const radiusX = Math.max(widthMm / 2 - config.borderWidthMm / 2 - config.topTextInsetMm, 1)
  const radiusY = Math.max(heightMm / 2 - config.borderWidthMm / 2 - config.topTextInsetMm, 1)
  const glyphs = getArcGlyphLayout(
    config.topText,
    centerX,
    centerY,
    radiusX,
    radiusY,
    config.topTextAngleDeg,
    config.topTextFontSizeMm,
  )

  return (
    <g
      fill={config.color}
      fontFamily={config.topTextFontFamily}
      fontSize={config.topTextFontSizeMm}
      stroke="none"
    >
      {glyphs.map((glyph, index) => (
        <text
          key={`${glyph.char}-${index}`}
          x={glyph.x}
          y={glyph.y}
          transform={`rotate(${glyph.rotation} ${glyph.x} ${glyph.y})`}
          textAnchor="middle"
          dominantBaseline="middle"
          textLength={glyph.width}
          lengthAdjust="spacingAndGlyphs"
        >
          {glyph.char}
        </text>
      ))}
    </g>
  )
}

/** 渲染可选的下横排文字。 */
function BottomText({
  config,
  visible,
  heightMm,
}: {
  config: SealConfig
  visible: boolean
  heightMm: number
}) {
  if (!visible || !config.bottomText.trim()) {
    return null
  }

  const y = heightMm / 2 + config.bottomTextTopFromCenterMm

  return (
    <text
      x="50%"
      y={y}
      fill={config.color}
      fontFamily={config.bottomTextFontFamily}
      fontSize={config.bottomTextFontSizeMm}
      textAnchor="middle"
      dominantBaseline="hanging"
    >
      {config.bottomText}
    </text>
  )
}

/** 渲染印章底部编码。 */
function CodeText({
  config,
  visible,
  widthMm,
  heightMm,
}: {
  config: SealConfig
  visible: boolean
  widthMm: number
  heightMm: number
}) {
  if (!visible || !config.codeText.trim()) {
    return null
  }

  const innerRadius = Math.min(widthMm, heightMm) / 2 - config.borderWidthMm
  const glyphWidthMm = Math.max(config.codeFontSizeMm * (5 / 6), 0.8)
  const glyphCenterDistanceMm = glyphWidthMm + config.codeLetterSpacingMm
  const radius = Math.max(
    innerRadius - config.codeBottomMarginMm - config.codeFontSizeMm / 2,
    1,
  )
  const glyphs = getBottomArcCodeLayout(
    config.codeText,
    widthMm / 2,
    heightMm / 2,
    radius,
    glyphCenterDistanceMm,
  )

  return (
    <g fill={config.color} fontFamily={config.codeFontFamily} fontSize={config.codeFontSizeMm}>
      {glyphs.map((glyph, index) => (
        <text
          key={`${glyph.char}-${index}`}
          x={glyph.x}
          y={glyph.y}
          textAnchor="middle"
          dominantBaseline="middle"
          textLength={glyphWidthMm}
          lengthAdjust="spacingAndGlyphs"
          transform={`rotate(${glyph.rotation} ${glyph.x} ${glyph.y})`}
        >
          {glyph.char}
        </text>
      ))}
    </g>
  )
}

/** 渲染发票章中心的统一社会信用代码。 */
function MiddleText({
  config,
  visible,
  heightMm,
}: {
  config: SealConfig
  visible: boolean
  heightMm: number
}) {
  if (!visible || !config.middleText.trim()) {
    return null
  }

  return (
    <text
      x="50%"
      y={heightMm / 2 + config.middleTextOffsetYMm}
      fill={config.color}
      fontFamily={config.middleTextFontFamily}
      fontSize={config.middleTextFontSizeMm}
      letterSpacing={config.middleTextLetterSpacingMm}
      textAnchor="middle"
      dominantBaseline="middle"
      textLength={config.middleTextWidthMm}
      lengthAdjust="spacingAndGlyphs"
    >
      {config.middleText}
    </text>
  )
}

/** 渲染发票章底部附加编号。 */
function SerialText({
  config,
  visible,
  heightMm,
}: {
  config: SealConfig
  visible: boolean
  heightMm: number
}) {
  if (!visible || !config.serialText.trim()) {
    return null
  }

  return (
    <text
      x="50%"
      y={heightMm / 2 + config.serialTopFromCenterMm}
      fill={config.color}
      fontFamily={config.serialFontFamily}
      fontSize={config.serialFontSizeMm}
      letterSpacing={config.serialLetterSpacingMm}
      textAnchor="middle"
      dominantBaseline="hanging"
    >
      {config.serialText}
    </text>
  )
}

/** 渲染中心五角星。 */
function CenterStar({
  config,
  visible,
  widthMm,
  heightMm,
}: {
  config: SealConfig
  visible: boolean
  widthMm: number
  heightMm: number
}) {
  if (!visible) {
    return null
  }

  const centerX = widthMm / 2
  const centerY = heightMm / 2 - config.centerSymbolOffsetYMm

  return (
    <polygon
      points={getStarPoints(centerX, centerY, config.centerSymbolSizeMm)}
      fill={config.color}
      stroke="none"
    />
  )
}

/** 渲染印章外轮廓。 */
function Outline({
  config,
  preset,
  widthMm,
  heightMm,
}: {
  config: SealConfig
  preset: TemplatePreset
  widthMm: number
  heightMm: number
}) {
  if (preset.shape === 'ellipse') {
    return (
      <ellipse
        cx={widthMm / 2}
        cy={heightMm / 2}
        rx={widthMm / 2 - config.borderWidthMm / 2}
        ry={heightMm / 2 - config.borderWidthMm / 2}
        fill="none"
        stroke={config.color}
        strokeWidth={config.borderWidthMm}
      />
    )
  }

  return (
    <circle
      cx={widthMm / 2}
      cy={heightMm / 2}
      r={Math.min(widthMm, heightMm) / 2 - config.borderWidthMm / 2}
      fill="none"
      stroke={config.color}
      strokeWidth={config.borderWidthMm}
    />
  )
}

/** 将参数化配置渲染成可预览与导出的 SVG 印章。 */
export function SealRenderer({ config, preset, svgRef }: SealRendererProps) {
  const widthMm = config.widthMm
  const heightMm = config.heightMm

  return (
    <svg
      ref={svgRef}
      width={widthMm}
      height={heightMm}
      viewBox={`0 0 ${widthMm} ${heightMm}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${preset.name}预览`}
    >
      <title>{preset.name}预览</title>
      <Outline config={config} preset={preset} widthMm={widthMm} heightMm={heightMm} />
      <ArcText config={config} widthMm={widthMm} heightMm={heightMm} />
      <CenterStar config={config} visible={preset.showStar} widthMm={widthMm} heightMm={heightMm} />
      <MiddleText
        config={config}
        visible={preset.showMiddleText}
        heightMm={heightMm}
      />
      <BottomText config={config} visible={preset.showBottomText} heightMm={heightMm} />
      <SerialText config={config} visible={preset.showSerialText} heightMm={heightMm} />
      <CodeText config={config} visible={preset.showCode} widthMm={widthMm} heightMm={heightMm} />
    </svg>
  )
}
