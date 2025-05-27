import type { D3Node } from './types'

export function formatNodeText(text: string, maxLength: number = 10): string {
  if (!text) return 'Статус'
  if (text.length <= maxLength) return text
  
  // Разбиваем на слова
  const words = text.split(' ')
  if (words.length === 1) {
    // Одно длинное слово - обрезаем с многоточием
    return text.substring(0, maxLength - 1) + '…'
  }
  
  // Несколько слов - пытаемся сократить
  let result = words[0]
  for (let i = 1; i < words.length; i++) {
    const newResult = result + ' ' + words[i]
    if (newResult.length <= maxLength) {
      result = newResult
    } else {
      break
    }
  }
  
  if (result.length < text.length) {
    result += '…'
  }
  
  return result
}

export function findNodeAtPosition(nodes: D3Node[], x: number, y: number, radius: number): D3Node | undefined {
  return nodes.find(node => {
    const dx = x - node.x
    const dy = y - node.y
    return (dx * dx + dy * dy) <= (radius * radius)
  })
}
