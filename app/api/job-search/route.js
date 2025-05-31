import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: Fetch user profile
async function getUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { skills: true, education: true },
  });
}

// Helper: Generate personalized job search strategies using Gemini
async function generateJobSearchStrategies(userProfile, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert job search strategist. Generate personalized job search strategies, recommendations, and insights for the role of ${targetRole} in the ${industry} industry. Use this user profile: ${JSON.stringify(userProfile)}. Return as JSON: {strategies: string[], recommendations: string[], insights: string}.`;
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

export async function POST(req) {
  try {
    const { userId, targetRole, industry } = await req.json();
    if (!userId || !targetRole || !industry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Generate personalized job search strategies
    const jobSearchStrategies = await generateJobSearchStrategies(userProfile, targetRole, industry);
    // 3. Store job search data
    const storedJobSearch = await prisma.jobSearch.create({
      data: {
        userId,
        targetRole,
        industry,
        strategies: jobSearchStrategies.strategies,
        recommendations: jobSearchStrategies.recommendations,
        insights: jobSearchStrategies.insights,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      jobSearch: {
        strategies: jobSearchStrategies.strategies,
        recommendations: jobSearchStrategies.recommendations,
        insights: jobSearchStrategies.insights,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 