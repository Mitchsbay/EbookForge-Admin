import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const isSample = formData.get('sample') === 'true';

    if (isSample) {
      // Return sample document for testing
      return NextResponse.json({
        success: true,
        document: {
          filename: 'sample-ebook.docx',
          rawText: SAMPLE_EBOOK_TEXT,
          detectedSections: SAMPLE_SECTIONS,
          detectedTitle: 'Simple Guide to Personal Finance',
          detectedAuthor: '',
          detectedSubtitle: 'A Beginner\'s Handbook for Managing Your Money',
          warnings: ['This is a sample document for testing purposes'],
          stats: {
            totalWords: 2500,
            totalCharacters: 15000,
            totalParagraphs: 45,
            estimatedReadingTime: 10,
            headingCount: 12,
            listCount: 8,
          },
        },
      });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .docx files are accepted.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file provided' }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the document' },
        { status: 400 }
      );
    }

    // Analyze the extracted text
    const analysis = analyzeDocument(rawText);

    return NextResponse.json({
      success: true,
      document: {
        filename: file.name,
        rawText: rawText,
        detectedSections: analysis.sections,
        detectedTitle: analysis.title,
        detectedAuthor: analysis.author,
        detectedSubtitle: analysis.subtitle,
        warnings: analysis.warnings,
        stats: analysis.stats,
      },
    });
  } catch (error) {
    console.error('Document extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from document. Make sure it\'s a valid .docx file.' },
      { status: 500 }
    );
  }
}

function analyzeDocument(text: string) {
  const lines = text.split('\n').filter((line) => line.trim());
  const words = text.split(/\s+/).filter(Boolean);
  const warnings: string[] = [];

  // Basic stats
  const stats = {
    totalWords: words.length,
    totalCharacters: text.length,
    totalParagraphs: lines.length,
    estimatedReadingTime: Math.ceil(words.length / 200), // ~200 words per minute
    headingCount: 0,
    listCount: 0,
  };

  // Detect sections (lines that look like headings)
  const sections: { title: string; content: string; level: number; wordCount: number }[] = [];
  let currentSection: { title: string; content: string[]; level: number } | null = null;
  let sectionContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

    // Check if this looks like a heading
    const isHeading =
      // Short line followed by substantial content
      (line.length < 100 && nextLine.length > 100) ||
      // All caps line
      (line === line.toUpperCase() && line.length > 3 && line.length < 100) ||
      // Numbered section (e.g., "Chapter 1", "1. Introduction")
      /^(Chapter|Section|Part)\s+\d+/i.test(line) ||
      /^\d+\.\s+[A-Z]/.test(line) ||
      // Line ending with colon that introduces content
      (line.endsWith(':') && nextLine.length > 50) ||
      // Title case with significant content following
      (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(line) && nextLine.length > 100);

    if (isHeading && line.length > 2 && !line.endsWith('.')) {
      // Save previous section
      if (currentSection) {
        const content = sectionContent.join('\n');
        sections.push({
          title: currentSection.title,
          content: content,
          level: currentSection.level,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        });
      }

      // Start new section
      currentSection = {
        title: line.replace(/^[#\d\.\s]+/, '').trim(),
        content: [],
        level: line.startsWith('#') ? (line.match(/^(##)/) ? 2 : 1) : 1,
      };
      sectionContent = [];
      stats.headingCount++;
    } else if (currentSection) {
      sectionContent.push(line);
    }

    // Count lists
    if (/^[\*\-\•]\s/.test(line) || /^\d+\.\s/.test(line)) {
      stats.listCount++;
    }
  }

  // Add final section
  if (currentSection && sectionContent.length > 0) {
    const content = sectionContent.join('\n');
    sections.push({
      title: currentSection.title,
      content: content,
      level: currentSection.level,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    });
  }

  // Detect title (usually first non-empty line, or look for common patterns)
  let title = '';
  let subtitle = '';
  let author = '';

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 5 && line.length < 100) {
      if (!title) {
        title = line;
      } else if (!subtitle && line.length > 10) {
        subtitle = line;
        break;
      }
    }
  }

  // Look for author pattern
  const authorMatch = text.match(/(?:by|author:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (authorMatch) {
    author = authorMatch[1];
  }

  // Generate warnings
  if (stats.totalWords < 500) {
    warnings.push('Document is very short (' + stats.totalWords + ' words). Consider uploading a more complete document.');
  }

  if (stats.totalWords > 50000) {
    warnings.push('Document is quite long (' + stats.totalWords + ' words). Processing may take some time.');
  }

  if (sections.length < 3) {
    warnings.push('Few sections detected. Consider adding more structure with clear headings.');
  }

  // Check for very short sections
  const shortSections = sections.filter((s) => s.wordCount < 100);
  if (shortSections.length > 0 && sections.some((s) => s.wordCount > 500)) {
    warnings.push(shortSections.length + ' sections are very short. Consider expanding or combining them.');
  }

  // Check for very long paragraphs
  const longParagraphs = lines.filter((l) => l.split(/\s+/).length > 200);
  if (longParagraphs.length > 0) {
    warnings.push(longParagraphs.length + ' paragraphs are very long. Consider breaking them up.');
  }

  return {
    title,
    subtitle,
    author,
    sections: sections.slice(0, 20), // Limit to 20 sections for preview
    warnings,
    stats,
  };
}

const SAMPLE_EBOOK_TEXT = `
Simple Guide to Personal Finance
A Beginner's Handbook for Managing Your Money

Chapter 1: Understanding Your Financial Foundation

Financial literacy is the cornerstone of a secure and prosperous life. Understanding how money works—how to earn it, save it, invest it, and protect it—gives you the power to make informed decisions that shape your future.

Many people grow up without formal financial education. Schools rarely teach budgeting, investing, or understanding credit. This gap in knowledge often leads to poor financial decisions, debt accumulation, and unnecessary stress. But it's never too late to learn.

The First Step: Know Where You Stand

Before you can improve your financial situation, you need to understand it completely. This means:

• Calculating your net worth
• Tracking your income and expenses
• Understanding your debt obligations
• Reviewing your financial accounts

Chapter 2: Creating Your First Budget

Budgeting might sound restrictive, but it's actually liberating. A good budget gives every dollar a job, ensuring your money works toward your goals rather than disappearing on autopilot.

The 50/30/20 Rule

A simple framework for beginners:

1. 50% of income for needs (housing, food, utilities)
2. 30% for wants (entertainment, dining out)
3. 20% for savings and debt repayment

This isn't a rigid rule—it's a starting point. Adjust as needed for your circumstances.

Key Budget Categories

Consider tracking these essential categories:
- Housing costs (rent/mortgage, utilities, insurance)
- Transportation (car payment, gas, public transit)
- Food (groceries and dining out)
- Healthcare (insurance, medications, co-pays)
- Savings (emergency fund, retirement, goals)
- Debt payments (credit cards, loans)

Chapter 3: Building an Emergency Fund

An emergency fund is your financial safety net. It's the money you set aside for unexpected expenses—a car repair, medical bill, or job loss. Without one, you'd likely need to rely on credit cards or loans, creating debt that could take years to pay off.

How Much Do You Need?

Aim for 3-6 months of essential expenses. If your monthly needs are $3,000, your target is $9,000 to $18,000.

Start small if this feels overwhelming:
1. Save $1,000 first as a mini emergency fund
2. Build up to one month of expenses
3. Gradually work toward 3-6 months

Where to Keep It

Your emergency fund should be:
- Easily accessible (in a savings account)
- Separate from spending money
- Not invested in volatile assets

Chapter 4: Understanding and Eliminating Debt

Debt is one of the biggest obstacles to financial freedom. Understanding your debt is the first step to conquering it.

Types of Debt

Good debt (potentially beneficial):
- Student loans for valuable education
- Mortgage for affordable housing
- Business loans for profitable ventures

Bad debt (usually harmful):
- High-interest credit cards
- Payday loans
- Personal loans for depreciating items

The Avalanche vs. Snowball Methods

Avalanche Method: Pay off debts with highest interest rates first. This saves the most mathematically.

Snowball Method: Pay off smallest debts first. This builds momentum and motivation.

Choose the method that works for your personality and stick with it.

Chapter 5: Investing Basics for Beginners

Investing is how you build wealth over time. Thanks to compound growth, even modest investments can grow significantly over decades.

Starting Simple: Index Funds

Index funds are a great starting point for new investors:
- Low fees
- Automatic diversification
- Simple to understand
- Proven long-term performance

Chapter 6: Planning for Retirement

It's never too early to think about retirement. The earlier you start, the less you need to save each month thanks to compound growth.

Retirement Account Options

401(k) Plans
- Often include employer matching
- Pre-tax contributions reduce taxable income
- Limited investment options

IRAs (Individual Retirement Accounts)
- Traditional IRA: Tax-deductible contributions
- Roth IRA: Tax-free withdrawals in retirement

Conclusion: Your Financial Journey Starts Now

Taking control of your finances is one of the most empowering things you can do. It requires patience, discipline, and continuous learning—but the rewards are worth it.

Remember these key principles:
- Spend less than you earn
- Save consistently
- Invest for the long term
- Protect yourself with insurance and emergency funds
- Keep learning and adapting

Your financial future is in your hands. Start today.
`;

const SAMPLE_SECTIONS = [
  { title: 'Chapter 1: Understanding Your Financial Foundation', content: 'Introduction to financial literacy...', level: 1, wordCount: 400 },
  { title: 'Chapter 2: Creating Your First Budget', content: 'Budgeting basics...', level: 1, wordCount: 450 },
  { title: 'Chapter 3: Building an Emergency Fund', content: 'Emergency fund guidance...', level: 1, wordCount: 400 },
  { title: 'Chapter 4: Understanding and Eliminating Debt', content: 'Debt management...', level: 1, wordCount: 400 },
  { title: 'Chapter 5: Investing Basics for Beginners', content: 'Investing introduction...', level: 1, wordCount: 350 },
  { title: 'Chapter 6: Planning for Retirement', content: 'Retirement planning...', level: 1, wordCount: 400 },
  { title: 'Conclusion', content: 'Summary and key takeaways...', level: 1, wordCount: 200 },
];
