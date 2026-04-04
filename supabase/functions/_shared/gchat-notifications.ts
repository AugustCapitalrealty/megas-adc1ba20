// Example: Google Chat notification templates
// This can be integrated into trigger functions or Edge Functions

import {
  sendGChatMessage,
  buildCard,
  createDecoratedTextWidget,
  createStatGrid,
  createSectionHeader,
  createDivider,
  createFooterSummary,
  createButtonWidget,
} from '../_shared/gchat-helpers.ts'

const COLORS = {
  critical: '#D32F2F',
  warning: '#F57C00',
  success: '#43A047',
  info: '#1E88E5',
}

/**
 * Send a notification to Google Chat when an OC (Ordem de Compra) is issued
 */
export async function notifyOCIssued(
  data: {
    protocolo: string
    cliente: string
    fornecedor: string
    valor: number
    status: string
    empreendimento: string
  },
  webhookUrl: string
) {
  const widgets = [
    createDecoratedTextWidget({
      topLabel: 'Protocolo',
      text: `<b>${data.protocolo}</b>`,
      icon: 'TASK',
    }),
    createDecoratedTextWidget({
      topLabel: 'Cliente',
      text: data.cliente,
      icon: 'PERSON',
    }),
    createDecoratedTextWidget({
      topLabel: 'Fornecedor',
      text: data.fornecedor,
      icon: 'BUSINESS',
    }),
    createDecoratedTextWidget({
      topLabel: 'Valor',
      text: `<b><font color="${COLORS.success}">R$ ${data.valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}</font></b>`,
      icon: 'DOLLAR',
    }),
    createDecoratedTextWidget({
      topLabel: 'Empreendimento',
      text: data.empreendimento,
      icon: 'HOTEL_ROOM_TYPE',
    }),
  ]

  const message = buildCard(
    '📋 OC Emitida com Sucesso',
    `Gerada em ${new Date().toLocaleString('pt-BR')}`,
    [
      {
        header: createSectionHeader({
          emoji: '✅',
          title: 'Detalhes da Ordem',
          color: COLORS.success,
        }),
        widgets,
      },
      createDivider(),
      {
        widgets: [
          createButtonWidget([
            { text: '🔍 Ver Detalhes', url: `https://megas.lovable.app/solicitacoes/${data.protocolo}` },
          ]),
        ],
      },
    ]
  )

  return sendGChatMessage(webhookUrl, message)
}

/**
 * Send a notification when a correction request is created
 */
export async function notifyCorrectionsRequested(
  data: {
    protocolo: string
    cliente: string
    motivo: string
    prazo: string
    detalhes?: string
  },
  webhookUrl: string
) {
  const widgets = [
    createDecoratedTextWidget({
      topLabel: 'Protocolo',
      text: `<b>${data.protocolo}</b>`,
      icon: 'TASK',
    }),
    createDecoratedTextWidget({
      topLabel: 'Cliente',
      text: data.cliente,
      icon: 'PERSON',
    }),
    createDecoratedTextWidget({
      topLabel: 'Motivo',
      text: data.motivo,
      icon: 'WARNING',
    }),
    createDecoratedTextWidget({
      topLabel: 'Prazo para Correção',
      text: `<b><font color="${COLORS.warning}">${data.prazo}</font></b>`,
      icon: 'CLOCK',
    }),
  ]

  if (data.detalhes) {
    widgets.push({
      decoratedText: {
        text: `<font color="#666" size=1>${data.detalhes}</font>`,
      },
    })
  }

  const message = buildCard(
    '🔴 Correção Solicitada',
    `Requer ação até ${data.prazo}`,
    [
      {
        header: createSectionHeader({
          emoji: '⚠️',
          title: 'Ação Requerida',
          color: COLORS.critical,
          subtitle: 'Solicitação bloqueada até correções',
        }),
        widgets,
      },
      createDivider(),
      {
        widgets: [
          createButtonWidget([
            { text: '🔧 Fazer Correções', url: `https://megas.lovable.app/solicitacoes/${data.protocolo}/corrigir` },
          ]),
        ],
      },
    ]
  )

  return sendGChatMessage(webhookUrl, message)
}

/**
 * Send a notification when SLA is about to expire
 */
export async function notifySLAAlert(
  data: {
    protocolo: string
    cliente: string
    status: string
    horasRestantes: number
    slaHoras?: number
  },
  webhookUrl: string
) {
  const horasLabel = data.horasRestantes < 24 ? `${Math.floor(data.horasRestantes)}h` : `${Math.floor(data.horasRestantes / 24)}d`
  const percentage = data.slaHoras ? Math.round((data.horasRestantes / data.slaHoras) * 100) : 0
  const alertColor = percentage > 50 ? COLORS.warning : COLORS.critical

  const widgets = [
    createDecoratedTextWidget({
      topLabel: 'Protocolo',
      text: `<b>${data.protocolo}</b>`,
      icon: 'TASK',
    }),
    createDecoratedTextWidget({
      topLabel: 'Cliente',
      text: data.cliente,
      icon: 'PERSON',
    }),
    createDecoratedTextWidget({
      topLabel: 'Status Atual',
      text: data.status,
      icon: 'INFO',
    }),
    createDecoratedTextWidget({
      topLabel: 'Tempo Restante',
      text: `<b><font color="${alertColor}">${horasLabel}</font></b> (${percentage}%)`,
      icon: 'CLOCK',
    }),
  ]

  const message = buildCard(
    '⏰ Alerta de SLA',
    `Solicitação próxima ao vencimento`,
    [
      {
        header: createSectionHeader({
          emoji: '⏱️',
          title: 'Urgente',
          color: alertColor,
          subtitle: `${percentage}% do SLA consumido`,
        }),
        widgets,
      },
      createDivider(),
      {
        widgets: [
          createButtonWidget([
            { text: '🚀 Acelerar Processo', url: `https://megas.lovable.app/solicitacoes/${data.protocolo}` },
          ]),
        ],
      },
    ]
  )

  return sendGChatMessage(webhookUrl, message)
}

/**
 * Send status badge colors
 */
export async function notifyStatusChange(
  data: {
    protocolo: string
    cliente: string
    statusAnterior: string
    statusNovo: string
    timestamp: Date
  },
  webhookUrl: string
) {
  const statusEmoji: Record<string, string> = {
    recebido: '📥',
    em_analise: '🔍',
    em_processamento: '⚙️',
    oc_ac_emitida: '📋',
    liberado_fornecedor: '✅',
    enviado_fornecedor: '📤',
    aguardando_execucao: '⏳',
    aguardando_nf_boleto: '💰',
    concluida: '🎉',
    rejeitado: '❌',
    cancelado: '🚫',
  }

  const message = buildCard(
    '🔄 Status Alterado',
    `${data.protocolo}`,
    [
      {
        header: createSectionHeader({
          emoji: '📊',
          title: 'Transição de Status',
          color: COLORS.info,
        }),
        widgets: [
          {
            decoratedText: {
              topLabel: 'Cliente',
              text: data.cliente,
              startIcon: { knownIcon: 'PERSON' },
            },
          },
          {
            textParagraph: {
              text: `<b>${statusEmoji[data.statusAnterior] || '·'} ${data.statusAnterior}</b> → <b>${statusEmoji[data.statusNovo] || '·'} ${data.statusNovo}</b>`,
            },
          },
          {
            textParagraph: {
              text: `<font size=1 color="#999">${data.timestamp.toLocaleString('pt-BR')}</font>`,
            },
          },
        ],
      },
    ]
  )

  return sendGChatMessage(webhookUrl, message)
}
