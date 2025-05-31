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

// Helper: Generate personalized career guidance using Gemini
async function generateCareerGuidance(userProfile, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert career coach. Generate personalized career guidance, strategic advice, and growth suggestions for the role of ${targetRole} in the ${industry} industry. Use this user profile: ${JSON.stringify(userProfile)}. Return as JSON: {guidance: string, strategicAdvice: string[], growthSuggestions: string[]}.`;
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

// (Stub) Helper: Fetch market data from O*NET/LinkedIn
async function getMarketData(role, industry) {
  // TODO: Integrate O*NET, LinkedIn, Glassdoor APIs
  return {
    salaryRange: { min: 60000, max: 120000, median: 90000 },
    growthRate: 'High',
    topSkills: ['Communication', 'Problem Solving', 'Technical Expertise'],
    demandLevel: 'High',
    keyTrends: ['AI adoption', 'Remote work', 'Upskilling'],
  };
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
    // 2. Generate personalized career guidance
    const careerGuidance = await generateCareerGuidance(userProfile, targetRole, industry);
    // 3. Store career guidance data
    const storedCareerGuidance = await prisma.careerGuidance.create({
      data: {
        userId,
        targetRole,
        industry,
        guidance: careerGuidance.guidance,
        strategicAdvice: careerGuidance.strategicAdvice,
        growthSuggestions: careerGuidance.growthSuggestions,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      careerGuidance: {
        guidance: careerGuidance.guidance,
        strategicAdvice: careerGuidance.strategicAdvice,
        growthSuggestions: careerGuidance.growthSuggestions,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 