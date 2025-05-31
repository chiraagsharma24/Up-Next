import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: Fetch real-time market data from external APIs
async function fetchMarketData(industry) {
  // TODO: Integrate with LinkedIn Economic Graph, Glassdoor, News API
  return {
    salaryRange: { min: 80000, max: 120000 },
    growthRate: 15,
    demandLevel: 'High',
    keyTrends: ['AI', 'Remote Work', 'Sustainability'],
  };
}

// Helper: Generate industry insights using Gemini
async function generateIndustryInsights(marketData, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert industry analyst. Generate insights for the ${industry} industry based on this market data: ${JSON.stringify(marketData)}. Return as JSON: {insights: string[], learningSuggestions: string[]}.`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  try {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (e) {
    return { error: 'Failed to parse Gemini response', raw: data };
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const industry = searchParams.get('industry');
    if (!industry) {
      return NextResponse.json({ error: 'Missing industry parameter' }, { status: 400 });
    }
    // 1. Fetch real-time market data
    const marketData = await fetchMarketData(industry);
    // 2. Generate industry insights
    const insights = await generateIndustryInsights(marketData, industry);
    // 3. Store industry insights
    const storedInsight = await prisma.industryInsight.create({
      data: {
        industry,
        salaryRange: marketData.salaryRange,
        growthRate: marketData.growthRate,
        demandLevel: marketData.demandLevel,
        keyTrends: marketData.keyTrends,
        insights: insights.insights,
        learningSuggestions: insights.learningSuggestions,
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      industry,
      marketData,
      insights: insights.insights,
      learningSuggestions: insights.learningSuggestions,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 