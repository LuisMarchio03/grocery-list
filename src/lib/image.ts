const MAX_DIM = 1024
const QUALITY = 0.7

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function compressImage(file: File): Promise<string> {
  const dataUrl = await readFile(file)
  const img = await loadImage(dataUrl)

  let { width, height } = img
  if (width >= height && width > MAX_DIM) {
    height = Math.round((height * MAX_DIM) / width)
    width = MAX_DIM
  } else if (height > width && height > MAX_DIM) {
    width = Math.round((width * MAX_DIM) / height)
    height = MAX_DIM
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', QUALITY)
}
