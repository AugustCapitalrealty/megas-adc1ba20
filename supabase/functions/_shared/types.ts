// Types for Google Chat API integration
// Reference: https://developers.google.com/chat/api/reference/rest/v1/cards

export interface GChatWidgetDimension {
  weight?: string
  heightPx?: number
}

export interface GChatDecoratedText {
  topLabel?: string
  text?: string
  bottomLabel?: string
  icon?: {
    knownIcon?: string
    imageUri?: string
  }
  startIcon?: {
    knownIcon?: string
    imageUri?: string
  }
  endIcon?: {
    knownIcon?: string
    imageUri?: string
  }
  onClick?: {
    openLink?: {
      url: string
    }
  }
  wrapText?: boolean
}

export interface GChatTextParagraph {
  text: string
}

export interface GChatButton {
  text: string
  onClick: {
    openLink: {
      url: string
    }
  }
  color?: string
  altText?: string
}

export interface GChatButtonList {
  buttons: GChatButton[]
}

export interface GChatColumn {
  horizontalSizeStyle?: 'FILL_AVAILABLE_SPACE' | 'FILL_MINIMUM_WIDTH'
  horizontalAlignment?: 'START' | 'CENTER' | 'END'
  verticalAlignment?: 'TOP' | 'CENTER' | 'BOTTOM'
  widgets: GChatWidget[]
}

export interface GChatColumns {
  columnItems: GChatColumn[]
}

export interface GChatWidget {
  decoratedText?: GChatDecoratedText
  textParagraph?: GChatTextParagraph
  buttonList?: GChatButtonList
  columns?: GChatColumns
  divider?: {
    topSpacing?: 'SPACING_NONE' | 'SPACING_SMALL' | 'SPACING_MEDIUM' | 'SPACING_LARGE'
  }
}

export interface GChatSection {
  header?: string
  collapsible?: boolean
  expandable?: boolean
  uncollapsibleWidgetsCount?: number
  widgets?: GChatWidget[]
}

export interface GChatCardHeader {
  title?: string
  subtitle?: string
  imageUrl?: string
  imageType?: 'SQUARE' | 'IMAGE'
  imageAltText?: string
}

export interface GChatCard {
  header?: GChatCardHeader
  sections?: GChatSection[]
  cardActions?: Array<{
    actionLabel?: string
    onClick?: {
      openLink?: {
        url: string
      }
    }
  }>
  peekCardHeader?: GChatCardHeader
  displayStyle?: 'PEEK' | 'DISPLAY'
}

export interface GChatCardV2 {
  cardId: string
  card: GChatCard
  sections?: GChatSection[]
}

export interface GChatMessage {
  cardsV2?: GChatCardV2[]
  text?: string
  thread?: {
    name: string
  }
}

// Helper types
export interface GChatStats {
  newToday: number
  updatedToday: number
  totalActive: number
  [key: string]: any
}

export interface GChatError {
  error: string
  status?: number
  timestamp?: string
}

export interface GChatSuccess {
  success: boolean
  message: string
  stats?: GChatStats
}

export type GChatResponse = GChatSuccess | GChatError
