/** 等待浏览器字体可用，降低导出 PNG 时字体回退的概率。 */
async function waitForFonts(): Promise<void> {
  if (!('fonts' in document)) {
    return
  }

  await document.fonts.ready
}

/** 将 SVG 序列化为可用于图片解码的字符串。 */
function serializeSvg(svgElement: SVGSVGElement): string {
  const clonedElement = svgElement.cloneNode(true) as SVGSVGElement
  clonedElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  return new XMLSerializer().serializeToString(clonedElement)
}

/** 加载 SVG 数据为图片对象，供 Canvas 绘制使用。 */
function loadSvgImage(svgMarkup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG 图片加载失败'))
    }

    image.src = url
  })
}

/** 将画布内容导出为 PNG 文件。 */
function triggerPngDownload(canvas: HTMLCanvasElement, fileName: string): void {
  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/** 将 SVG 印章导出为透明背景 PNG。 */
export async function downloadSealPng(
  svgElement: SVGSVGElement,
  fileName: string,
  scale: number,
): Promise<void> {
  await waitForFonts()

  const svgMarkup = serializeSvg(svgElement)
  const svgImage = await loadSvgImage(svgMarkup)
  const viewBox = svgElement.viewBox.baseVal
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewBox.width * scale)
  canvas.height = Math.round(viewBox.height * scale)

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建 PNG 导出画布')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(svgImage, 0, 0, canvas.width, canvas.height)
  triggerPngDownload(canvas, fileName)
}
