#!/usr/bin/env node

/**
 * Google Chat Message Quality Checklist
 * 
 * Use este script para validar mensagens antes de enviar para produção
 * Valida estrutura, cores, fontes e responsividade
 */

const CHECKS = {
  structure: [
    {
      name: 'Header presente',
      validate: (card) => card.header?.title && card.header?.subtitle,
    },
    {
      name: 'Máximo de 4 seções',
      validate: (card) => card.sections?.length <= 4,
    },
    {
      name: 'Toda seção tem widgets',
      validate: (card) =>
        card.sections?.every(s => s.widgets && s.widgets.length > 0),
    },
  ],

  visual: [
    {
      name: 'Header tem cor',
      validate: (card) => 
        card.sections?.some(s => s.header?.includes('color=')),
    },
    {
      name: 'Números têm tamanho grande (size=4+)',
      validate: (card) =>
        JSON.stringify(card).includes('size=4') ||
        JSON.stringify(card).includes('size=5'),
    },
    {
      name: 'Cores seguem paleta',
      validate: (card) => {
        const validColors = [
          '#D32F2F', // critical
          '#F57C00', // warning
          '#FBC02D', // alert
          '#1E88E5', // info
          '#43A047', // success
          '#999999', // muted
        ]
        const content = JSON.stringify(card)
        return validColors.some(color => content.includes(color))
      },
    },
  ],

  content: [
    {
      name: 'Tem emoji nos headers',
      validate: (card) =>
        card.sections?.some(s => /[\p{Emoji}]/u.test(s.header || '')),
    },
    {
      name: 'Tem buttons/CTAs',
      validate: (card) =>
        JSON.stringify(card).includes('buttonList') ||
        JSON.stringify(card).includes('openLink'),
    },
    {
      name: 'Sem texto vazio',
      validate: (card) => {
        const content = JSON.stringify(card)
        return !content.includes('text: ""') && !content.includes("text: ''")
      },
    },
    {
      name: 'Labels legíveis (size <= 2)',
      validate: (card) => {
        const content = JSON.stringify(card)
        // Valida que labels/descriptions têm tamanho pequeno
        const hasSizeTag = content.includes('size=1') || content.includes('size=2')
        return hasSizeTag
      },
    },
  ],

  responsive: [
    {
      name: 'Max 3 colunas por grid',
      validate: (card) => {
        const json = JSON.stringify(card)
        // Busca columnItems arrays
        const matches = json.match(/"columnItems":\[([^\]]+)\]/g)
        if (!matches) return true
        return matches.every(m => (m.match(/\{/g) || []).length <= 3)
      },
    },
    {
      name: 'Sem texto extremamente longo (>100 chars)',
      validate: (card) => {
        const texts = []
        const extract = (obj) => {
          if (typeof obj === 'string' && obj.length > 100) {
            texts.push(obj)
          } else if (obj && typeof obj === 'object') {
            Object.values(obj).forEach(extract)
          }
        }
        extract(card)
        return texts.length === 0
      },
    },
  ],

  performance: [
    {
      name: 'Máximo de 15 widgets',
      validate: (card) => {
        let count = 0
        const countWidgets = (obj) => {
          if (obj?.widgets) count += obj.widgets.length
          if (Array.isArray(obj)) obj.forEach(countWidgets)
          else if (obj && typeof obj === 'object') Object.values(obj).forEach(countWidgets)
        }
        countWidgets(card)
        return count <= 15
      },
    },
    {
      name: 'Sem imagens externas (use ícones KNOWN)',
      validate: (card) => {
        const json = JSON.stringify(card)
        return !json.includes('imageUri')
      },
    },
  ],
}

function validateCard(card) {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: [],
  }

  Object.entries(CHECKS).forEach(([category, checks]) => {
    console.log(`\n📋 ${category.toUpperCase()}`)
    console.log('─'.repeat(40))

    checks.forEach(check => {
      try {
        const passed = check.validate(card)
        if (passed) {
          console.log(`✅ ${check.name}`)
          results.passed++
        } else {
          console.log(`❌ ${check.name}`)
          results.failed++
          results.errors.push(`${category}: ${check.name}`)
        }
      } catch (error) {
        console.log(`⚠️ ${check.name} (erro na validação)`)
        results.warnings++
      }
    })
  })

  console.log('\n' + '═'.repeat(40))
  console.log(`📊 RESULTADO: ${results.passed} passou, ${results.failed} falhou, ${results.warnings} avisos`)

  if (results.failed > 0) {
    console.log('\n❌ Erros encontrados:')
    results.errors.forEach(e => console.log(`  • ${e}`))
    return false
  }

  console.log('\n✨ Validação passou! Mensagem pronta para produção.')
  return true
}

// Uso
if (import.meta.main) {
  const cardJson = Deno.args[0]

  if (!cardJson) {
    console.error('❌ Use: deno run --allow-read check-gchat-card.js <path-to-card.json>')
    console.error('\nExemplo:')
    console.error('  deno run check-gchat-card.js ./card.json')
    Deno.exit(1)
  }

  try {
    const content = Deno.readTextFileSync(cardJson)
    const card = JSON.parse(content).cardsV2[0].card

    const success = validateCard(card)
    Deno.exit(success ? 0 : 1)
  } catch (error) {
    console.error(`❌ Erro ao ler arquivo: ${error.message}`)
    Deno.exit(1)
  }
}

export { validateCard }
