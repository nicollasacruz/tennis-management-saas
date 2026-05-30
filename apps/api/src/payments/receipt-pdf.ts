import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb
} from 'pdf-lib';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const SECTION_GAP = 10;
const CARD_GAP = 10;
const BOTTOM_SAFE_AREA = 96;

const COLORS = {
  accent: rgb(0.78, 0.94, 0.25),
  accentSoft: rgb(0.93, 0.98, 0.84),
  background: rgb(0.98, 0.99, 0.95),
  border: rgb(0.82, 0.89, 0.71),
  panel: rgb(1, 1, 1),
  panelMuted: rgb(0.97, 0.99, 0.94),
  text: rgb(0.12, 0.22, 0.17),
  textMuted: rgb(0.42, 0.49, 0.42),
  textSoft: rgb(0.58, 0.65, 0.57)
};

type ReceiptPdfPayload = {
  amountCents: number;
  billingName: string;
  billingPhone: string;
  billingTaxId: string;
  competencyMonth: Date;
  description: string;
  dueDate: Date;
  issuer: string;
  method: string | null;
  paidAt: Date;
  planName: string | null;
  receiptNumber: string;
  responsibleName: string | null;
  signatureLabel: string;
  studentName: string;
};

type TextStyle = {
  color: ReturnType<typeof rgb>;
  font: PDFFont;
  lineHeight: number;
  size: number;
};

type ReceiptInfoItem = {
  label: string;
  tone?: 'accent' | 'default';
  value: string;
  valueFont?: 'bold' | 'regular';
};

type ReceiptCardLayout = {
  contentLines: string[];
  height: number;
  item: ReceiptInfoItem;
  labelLines: string[];
  tone: 'accent' | 'default';
  width: number;
  xOffset: number;
};

type ReceiptRow = {
  cards: ReceiptCardLayout[];
  height: number;
};

type ReceiptLayoutContext = {
  bold: PDFFont;
  logo?: PDFImage;
  page: PDFPage;
  pdfDoc: PDFDocument;
  payload: ReceiptPdfPayload;
  regular: PDFFont;
  y: number;
};

export async function buildReceiptPdf(
  payload: ReceiptPdfPayload,
  logoUrl?: string
) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogoImage(pdfDoc, logoUrl);

  const context: ReceiptLayoutContext = {
    bold,
    logo,
    page: pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    payload,
    pdfDoc,
    regular,
    y: 0
  };

  context.y = drawReceiptHeader(context, false);

  renderInfoGrid(context, 'Dados de faturação', [
    {
      label: 'Nome para recibo',
      tone: 'accent',
      value: payload.billingName
    },
    {
      label: 'Telefone',
      value: payload.billingPhone
    },
    {
      label: 'NIF',
      value: payload.billingTaxId
    },
    {
      label: 'Aluno',
      value: payload.studentName
    },
    ...(payload.responsibleName
      ? [
          {
            label: 'Responsável',
            value: payload.responsibleName
          }
        ]
      : [])
  ]);

  renderParagraphCard(
    context,
    'Descrição da cobrança',
    payload.description,
    'default'
  );

  renderSignatureBlock(context);
  drawFooters(pdfDoc, regular, bold, payload.issuer);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function loadLogoImage(pdfDoc: PDFDocument, logoUrl?: string) {
  if (!logoUrl) {
    return undefined;
  }

  try {
    const response = await fetch(logoUrl);

    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const bytes = new Uint8Array(await response.arrayBuffer());

    if (contentType.includes('png')) {
      return await pdfDoc.embedPng(bytes);
    }

    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      return await pdfDoc.embedJpg(bytes);
    }

    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      return await pdfDoc.embedJpg(bytes);
    }
  } catch {
    return undefined;
  }
}

function drawReceiptHeader(
  context: ReceiptLayoutContext,
  compact: boolean
) {
  const { page, payload, regular, bold, logo } = context;
  const headerHeight = compact ? 84 : 152;
  const cardX = PAGE_MARGIN;
  const cardY = PAGE_HEIGHT - PAGE_MARGIN - headerHeight;

  drawPageBackground(page);
  page.drawRectangle({
    color: COLORS.accentSoft,
    height: compact ? 58 : 104,
    width: PAGE_WIDTH,
    x: 0,
    y: PAGE_HEIGHT - (compact ? 58 : 104)
  });
  page.drawRectangle({
    borderColor: COLORS.border,
    borderWidth: 1.2,
    color: COLORS.panel,
    height: headerHeight,
    width: CONTENT_WIDTH,
    x: cardX,
    y: cardY
  });

  const padding = compact ? 14 : 20;
  const logoSize = compact ? 42 : 72;
  const logoBoxX = cardX + padding;
  const logoBoxY = cardY + headerHeight - padding - logoSize;

  page.drawRectangle({
    borderColor: COLORS.border,
    borderWidth: 1,
    color: COLORS.panelMuted,
    height: logoSize,
    width: logoSize,
    x: logoBoxX,
    y: logoBoxY
  });

  if (logo) {
    const scaled = logo.scale(
      Math.min((logoSize - 14) / logo.width, (logoSize - 14) / logo.height)
    );
    page.drawImage(logo, {
      height: scaled.height,
      width: scaled.width,
      x: logoBoxX + (logoSize - scaled.width) / 2,
      y: logoBoxY + (logoSize - scaled.height) / 2
    });
  }

  const metaCardWidth = compact ? 138 : 164;
  const metaCardHeight = compact ? 48 : 86;
  const metaCardX = cardX + CONTENT_WIDTH - padding - metaCardWidth;
  const metaCardY = cardY + headerHeight - padding - metaCardHeight;
  const titleX = logoBoxX + logoSize + 20;
  const titleWidth = metaCardX - titleX - 16;

  page.drawText('RECIBO DE PAGAMENTO', {
    color: COLORS.textSoft,
    font: bold,
    size: compact ? 9 : 10,
    x: titleX,
    y: cardY + headerHeight - padding - (compact ? 8 : 10)
  });

  const titleLines = wrapText(
    'Recibo ESAF',
    bold,
    compact ? 20 : 26,
    titleWidth
  );
  drawWrappedText(page, titleLines, titleX, cardY + headerHeight - padding - (compact ? 26 : 34), {
    color: COLORS.text,
    font: bold,
    lineHeight: compact ? 22 : 27,
    size: compact ? 20 : 26
  });

  const subtitle = compact
    ? payload.receiptNumber
    : `${payload.issuer}\n${payload.receiptNumber} · ${formatDate(payload.paidAt)}`;
  const subtitleLines = wrapText(
    subtitle,
    regular,
    compact ? 9 : 11,
    titleWidth
  );
  drawWrappedText(
    page,
    subtitleLines,
    titleX,
    cardY + headerHeight - padding - (compact ? 46 : 70),
    {
      color: COLORS.textMuted,
      font: regular,
      lineHeight: compact ? 11 : 14,
      size: compact ? 9 : 11
    }
  );

  page.drawRectangle({
    borderColor: COLORS.border,
    borderWidth: 1,
    color: COLORS.accentSoft,
    height: metaCardHeight,
    width: metaCardWidth,
    x: metaCardX,
    y: metaCardY
  });

  page.drawText(compact ? 'VALOR' : 'VALOR RECEBIDO', {
    color: COLORS.textMuted,
    font: bold,
    size: compact ? 8 : 9,
    x: metaCardX + 16,
    y: metaCardY + metaCardHeight - (compact ? 14 : 18)
  });
  page.drawText(formatCurrency(payload.amountCents), {
    color: COLORS.text,
    font: bold,
    size: compact ? 16 : 21,
    x: metaCardX + 16,
    y: metaCardY + metaCardHeight - (compact ? 29 : 44)
  });
  page.drawText(`N.º ${payload.receiptNumber}`, {
    color: COLORS.textMuted,
    font: regular,
    size: compact ? 7 : 9,
    x: metaCardX + 16,
    y: metaCardY + (compact ? 8 : 14)
  });

  if (!compact) {
    page.drawText('Liquidação confirmada', {
      color: COLORS.textMuted,
      font: regular,
      size: 9,
      x: metaCardX + 16,
      y: metaCardY + 26
    });
  }

  return cardY - 18;
}

function drawPageBackground(page: PDFPage) {
  page.drawRectangle({
    color: COLORS.background,
    height: PAGE_HEIGHT,
    width: PAGE_WIDTH,
    x: 0,
    y: 0
  });
}

function renderInfoGrid(
  context: ReceiptLayoutContext,
  title: string,
  items: ReceiptInfoItem[]
) {
  const rows = buildRows(context, items);
  const titleHeight = 30;

  rows.forEach((row, index) => {
    const requiredHeight = row.height + (index === 0 ? titleHeight + 8 : 0);
    ensureSpace(context, requiredHeight);

    if (index === 0) {
      drawSectionTitle(context, title);
    }

    drawInfoRow(context, row);
    context.y -= row.height + CARD_GAP;
  });

  context.y -= SECTION_GAP;
}

function renderParagraphCard(
  context: ReceiptLayoutContext,
  title: string,
  text: string,
  tone: 'accent' | 'default'
) {
  const titleHeight = 30;
  const boxPaddingX = 18;
  const boxPaddingY = 16;
  const lineStyle: TextStyle = {
    color: COLORS.textMuted,
    font: context.regular,
    lineHeight: 15,
    size: 11
  };
  const lines = wrapText(
    text || 'Sem descrição complementar.',
    lineStyle.font,
    lineStyle.size,
    CONTENT_WIDTH - boxPaddingX * 2
  );
  let cursor = 0;
  let isFirstChunk = true;

  while (cursor < lines.length) {
    const titleOffset = isFirstChunk ? titleHeight + 8 : 0;
    ensureSpace(context, titleOffset + 84);

    if (isFirstChunk) {
      drawSectionTitle(context, title);
    }

    const availableHeight = context.y - BOTTOM_SAFE_AREA;
    const usableTextHeight = availableHeight - boxPaddingY * 2;
    const maxLines = Math.max(1, Math.floor(usableTextHeight / lineStyle.lineHeight));
    const chunkLines = lines.slice(cursor, cursor + maxLines);
    const boxHeight = boxPaddingY * 2 + chunkLines.length * lineStyle.lineHeight;

    drawCardBox(context.page, PAGE_MARGIN, context.y - boxHeight, CONTENT_WIDTH, boxHeight, tone);
    drawWrappedText(
      context.page,
      chunkLines,
      PAGE_MARGIN + boxPaddingX,
      context.y - boxPaddingY,
      lineStyle
    );

    context.y -= boxHeight + CARD_GAP;
    cursor += chunkLines.length;
    isFirstChunk = false;

    if (cursor < lines.length) {
      ensureSpace(context, 72);
      const continuation = `${title} (continuação)`;
      drawSectionTitle(context, continuation);
    }
  }

  context.y -= SECTION_GAP;
}

function renderConfirmationCard(context: ReceiptLayoutContext) {
  const statement =
    `Recebido de ${context.payload.billingName} no valor de ${formatCurrency(
      context.payload.amountCents
    )}, referente a ${formatMonth(
      context.payload.competencyMonth
    )}, com liquidação confirmada em ${formatDate(context.payload.paidAt)}.`;

  renderParagraphCard(context, 'Resumo do recibo', statement, 'accent');
}

function renderSignatureBlock(context: ReceiptLayoutContext) {
  const blockHeight = 86;
  const titleHeight = 30;

  ensureSpace(context, titleHeight + blockHeight);
  drawSectionTitle(context, 'Validação');

  drawCardBox(
    context.page,
    PAGE_MARGIN,
    context.y - blockHeight,
    CONTENT_WIDTH,
    blockHeight,
    'default'
  );

  const leftX = PAGE_MARGIN + 18;
  const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2 + 12;
  const topY = context.y - 18;

  drawWrappedText(
    context.page,
    wrapText(
      'Documento emitido eletronicamente pela ESAF e válido como comprovativo interno.',
      context.regular,
      10,
      CONTENT_WIDTH / 2 - 34
    ),
    leftX,
    topY,
    {
      color: COLORS.textMuted,
      font: context.regular,
      lineHeight: 13,
      size: 10
    }
  );

  context.page.drawText('Assinatura do clube', {
    color: COLORS.textSoft,
    font: context.bold,
    size: 9,
    x: rightX,
    y: topY - 4
  });
  context.page.drawLine({
    color: COLORS.border,
    end: { x: PAGE_WIDTH - PAGE_MARGIN - 20, y: context.y - 48 },
    start: { x: rightX, y: context.y - 48 },
    thickness: 1.2
  });
  context.page.drawText(context.payload.signatureLabel, {
    color: COLORS.text,
    font: context.bold,
    size: 11,
    x: rightX,
    y: context.y - 66
  });
  context.page.drawText(context.payload.issuer, {
    color: COLORS.textMuted,
    font: context.regular,
    size: 9,
    x: rightX,
    y: context.y - 78
  });

  context.y -= blockHeight + SECTION_GAP;
}

function buildRows(context: ReceiptLayoutContext, items: ReceiptInfoItem[]) {
  const rows: ReceiptRow[] = [];
  const columnWidth = (CONTENT_WIDTH - CARD_GAP) / 2;

  for (let index = 0; index < items.length; index += 2) {
    const pair = items.slice(index, index + 2);
    const cards = pair.map<ReceiptCardLayout>((item, pairIndex) =>
      buildCardLayout(context, item, pair.length === 1 ? CONTENT_WIDTH : columnWidth, pair.length === 1 ? 0 : pairIndex * (columnWidth + CARD_GAP))
    );
    rows.push({
      cards,
      height: Math.max(...cards.map((card) => card.height))
    });
  }

  return rows;
}

function buildCardLayout(
  context: ReceiptLayoutContext,
  item: ReceiptInfoItem,
  width: number,
  xOffset: number
) {
  const labelStyle: TextStyle = {
    color: COLORS.textSoft,
    font: context.bold,
    lineHeight: 11,
    size: 9
  };
  const valueStyle: TextStyle = {
    color: COLORS.text,
    font: item.valueFont === 'bold' ? context.bold : context.regular,
    lineHeight: 16,
    size: 12
  };
  const horizontalPadding = 16;
  const verticalPadding = 12;
  const labelLines = wrapText(
    item.label.toUpperCase(),
    labelStyle.font,
    labelStyle.size,
    width - horizontalPadding * 2
  );
  const contentLines = wrapText(
    item.value || '—',
    valueStyle.font,
    valueStyle.size,
    width - horizontalPadding * 2
  );
  const height =
    verticalPadding * 2 +
    labelLines.length * labelStyle.lineHeight +
    8 +
    contentLines.length * valueStyle.lineHeight;

  return {
    contentLines,
    height,
    item,
    labelLines,
    tone: item.tone ?? 'default',
    width,
    xOffset
  };
}

function drawInfoRow(context: ReceiptLayoutContext, row: ReceiptRow) {
  row.cards.forEach((card) => {
    const x = PAGE_MARGIN + card.xOffset;
    const y = context.y - row.height;
    const boxPaddingX = 16;
    const boxPaddingY = 14;

    drawCardBox(context.page, x, y, card.width, row.height, card.tone);
    drawWrappedText(context.page, card.labelLines, x + boxPaddingX, context.y - boxPaddingY, {
      color: COLORS.textSoft,
      font: context.bold,
      lineHeight: 11,
      size: 9
    });
    drawWrappedText(
      context.page,
      card.contentLines,
      x + boxPaddingX,
      context.y -
        boxPaddingY -
        card.labelLines.length * 11 -
        8,
      {
        color: COLORS.text,
        font: card.item.valueFont === 'bold' ? context.bold : context.regular,
        lineHeight: 16,
        size: 12
      }
    );
  });
}

function drawCardBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  tone: 'accent' | 'default'
) {
  page.drawRectangle({
    borderColor: COLORS.border,
    borderWidth: 1,
    color: tone === 'accent' ? COLORS.accentSoft : COLORS.panel,
    height,
    width,
    x,
    y
  });

  if (tone === 'accent') {
    page.drawRectangle({
      color: COLORS.accent,
      height,
      width: 5,
      x,
      y
    });
  }
}

function drawSectionTitle(context: ReceiptLayoutContext, title: string) {
  context.page.drawRectangle({
    color: COLORS.accent,
    height: 16,
    width: 4,
    x: PAGE_MARGIN,
    y: context.y - 20
  });
  context.page.drawText(title, {
    color: COLORS.text,
    font: context.bold,
    size: 15,
    x: PAGE_MARGIN + 12,
    y: context.y - 18
  });
  context.y -= 30;
}

function drawWrappedText(
  page: PDFPage,
  lines: string[],
  x: number,
  topY: number,
  style: TextStyle
) {
  lines.forEach((line, index) => {
    page.drawText(line, {
      color: style.color,
      font: style.font,
      size: style.size,
      x,
      y: topY - style.size - index * style.lineHeight
    });
  });
}

function ensureSpace(context: ReceiptLayoutContext, requiredHeight: number) {
  if (context.y - requiredHeight >= BOTTOM_SAFE_AREA) {
    return;
  }

  context.page = context.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  context.y = drawReceiptHeader(context, true);
}

function drawFooters(pdfDoc: PDFDocument, regular: PDFFont, bold: PDFFont, issuer: string) {
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    page.drawLine({
      color: COLORS.border,
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 42 },
      start: { x: PAGE_MARGIN, y: 42 },
      thickness: 1
    });
    page.drawText(issuer, {
      color: COLORS.textMuted,
      font: bold,
      size: 9,
      x: PAGE_MARGIN,
      y: 27
    });
    page.drawText('Documento emitido eletronicamente', {
      color: COLORS.textSoft,
      font: regular,
      size: 9,
      x: PAGE_MARGIN,
      y: 15
    });
    page.drawText(`Página ${index + 1}/${pages.length}`, {
      color: COLORS.textMuted,
      font: regular,
      size: 9,
      x: PAGE_WIDTH - PAGE_MARGIN - 52,
      y: 21
    });
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = (text || '—').split(/\r?\n/);
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    const trimmed = paragraph.trim();

    if (!trimmed) {
      lines.push('');
      return;
    }

    let currentLine = '';

    for (const word of trimmed.split(/\s+/)) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        currentLine = word;
        continue;
      }

      let fragment = '';

      for (const character of word) {
        const nextFragment = `${fragment}${character}`;

        if (
          fragment &&
          font.widthOfTextAtSize(nextFragment, size) > maxWidth
        ) {
          lines.push(fragment);
          fragment = character;
          continue;
        }

        fragment = nextFragment;
      }

      currentLine = fragment;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines.length > 0 ? lines : ['—'];
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat('pt-PT', {
    currency: 'EUR',
    style: 'currency'
  }).format(amountCents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('pt-PT', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

function paymentMethodLabel(method: string | null) {
  if (method === 'CARD') {
    return 'Cartão';
  }

  if (method === 'BANK_TRANSFER') {
    return 'Transferência bancária';
  }

  if (method === 'MBWAY') {
    return 'MB WAY';
  }

  if (method === 'CASH') {
    return 'Dinheiro';
  }

  return 'Método por definir';
}
