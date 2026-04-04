// Google Chat webhook helpers

interface GChatButton {
  text: string
  url: string
}

interface GChatCard {
  header?: {
    title: string
    subtitle?: string
  }
  sections: Array<{
    header?: string
    collapsible?: boolean
    widgets: any[]
  }>
}

interface GChatMessage {
  cardsV2: Array<{
    cardId: string
    card: GChatCard
  }>
  text?: string
}

// Theme colors
const COLORS = {
  critical: '#D32F2F',
  warning: '#F57C00',
  alert: '#FBC02D',
  info: '#1E88E5',
  success: '#43A047',
  muted: '#999999',
  text: '#202124',
}

export async function sendGChatMessage(
  webhookUrl: string,
  message: GChatMessage
): Promise<Response> {
  if (!webhookUrl) {
    throw new Error('GCHAT_WEBHOOK_URL not configured')
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Chat webhook failed [${response.status}]: ${errorText}`)
  }

  return response
}

export function buildCard(
  title: string,
  subtitle: string,
  sections: Array<{ header?: string; collapsible?: boolean; widgets: any[] }>
): GChatMessage {
  return {
    cardsV2: [
      {
        cardId: `card-${Date.now()}`,
        card: {
          header: { title, subtitle },
          sections,
        },
      },
    ],
  }
}

/**
 * Create a stat widget with colored number
 */
export function createStatWidget(config: {
  value: string | number
  label: string
  color?: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
}) {
  const sizeMap = { small: 2, medium: 4, large: 5 }
  const size = sizeMap[config.size || 'medium']
  const color = config.color || COLORS.info

  return {
    horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'CENTER',
    widgets: [
      { textParagraph: { text: `<b><font size=${size} color="${color}">${config.value}</font></b>` } },
      { textParagraph: { text: `<font size=1 color="${COLORS.text}">${config.label}</font>` } },
    ],
  }
}

/**
 * Create a section header with emoji and color
 */
export function createSectionHeader(config: {
  emoji: string
  title: string
  color?: string
  subtitle?: string
}): string {
  const color = config.color || COLORS.info
  let header = `<b><font color="${color}">${config.emoji} ${config.title}</font></b>`
  if (config.subtitle) {
    header += `<br/><font size=1 color="${COLORS.muted}">${config.subtitle}</font>`
  }
  return header
}

/**
 * Create a decorated text widget with icon
 */
export function createDecoratedTextWidget(config: {
  topLabel: string
  text: string
  icon?: string
  color?: string
}) {
  return {
    decoratedText: {
      topLabel: config.topLabel,
      text: config.text,
      startIcon: config.icon ? { knownIcon: config.icon } : undefined,
    },
  }
}

/**
 * Create a button widget
 */
export function createButtonWidget(buttons: Array<{ text: string; url: string }>) {
  return {
    buttonList: {
      buttons: buttons.map(btn => ({
        text: btn.text,
        onClick: { openLink: { url: btn.url } },
      })),
    },
  }
}

/**
 * Create a grid of stat widgets (typically 3 per row)
 */
export function createStatGrid(stats: Array<{ value: string | number; label: string; color?: string }>) {
  const rows: any[] = []
  for (let i = 0; i < stats.length; i += 3) {
    rows.push({
      columns: {
        columnItems: stats.slice(i, i + 3).map(stat =>
          createStatWidget({
            value: stat.value,
            label: stat.label,
            color: stat.color,
            size: 'medium',
          })
        ),
      },
    })
  }
  return rows
}

/**
 * Create a divider
 */
export function createDivider() {
  return { divider: { topSpacing: 'SPACING_MEDIUM' } }
}

/**
 * Create a summary footer
 */
export function createFooterSummary(text: string) {
  return {
    textParagraph: {
      text: `<font size=1 color="${COLORS.muted}">${text}</font>`,
    },
  }
}

/**
 * Create a badge/label with color
 */
export function createBadge(config: {
  text: string
  color?: string
  size?: 'small' | 'large'
}): string {
  const color = config.color || COLORS.info
  const size = config.size === 'large' ? 2 : 1
  return `<b><font size=${size} color="${color}">${config.text}</font></b>`
}
