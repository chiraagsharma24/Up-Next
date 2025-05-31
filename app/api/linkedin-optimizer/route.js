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

// Helper: Analyze LinkedIn profile using Gemini
async function analyzeLinkedInProfile(userProfile, linkedInUrl, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert LinkedIn profile optimizer. Analyze this LinkedIn profile: ${linkedInUrl} for the role of ${targetRole} in the ${industry} industry. Use this user profile: ${JSON.stringify(userProfile)}. Return as JSON: {analysis: string, growthSuggestions: string[], optimizationTips: string[]}.`;
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
    const { userId, linkedInUrl, targetRole, industry } = await req.json();
    if (!userId || !linkedInUrl || !targetRole || !industry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Analyze LinkedIn profile
    const analysis = await analyzeLinkedInProfile(userProfile, linkedInUrl, targetRole, industry);
    // 3. Store LinkedIn profile data
    const storedLinkedInProfile = await prisma.linkedInProfile.create({
      data: {
        userId,
        linkedInUrl,
        targetRole,
        industry,
        analysis: analysis.analysis,
        growthSuggestions: analysis.growthSuggestions,
        optimizationTips: analysis.optimizationTips,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      linkedInProfile: {
        analysis: analysis.analysis,
        growthSuggestions: analysis.growthSuggestions,
        optimizationTips: analysis.optimizationTips,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 