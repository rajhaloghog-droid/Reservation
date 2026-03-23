export async function resizeImageFile(file: File, maxDimension = 800, quality = 0.8): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const targetWidth = Math.max(1, Math.round(image.width * scale))
  const targetHeight = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to prepare the selected image.')
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)
  return canvas.toDataURL('image/jpeg', quality)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Unable to read the selected image.'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the selected image.'))
    image.src = src
  })
}
