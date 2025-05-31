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

// Helper: Generate personalized onboarding content using Gemini
async function generateOnboardingContent(userProfile, preferences, goals) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert onboarding coach. Generate personalized onboarding content, recommendations, and next steps for this user profile: ${JSON.stringify(userProfile)}, preferences: ${JSON.stringify(preferences)}, and goals: ${JSON.stringify(goals)}. Return as JSON: {content: string, recommendations: string[], nextSteps: string[]}.`;
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
    const { userId, preferences, goals } = await req.json();
    if (!userId || !preferences || !goals) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Generate personalized onboarding content
    const onboardingContent = await generateOnboardingContent(userProfile, preferences, goals);
    // 3. Store onboarding data
    const storedOnboarding = await prisma.onboarding.create({
      data: {
        userId,
        preferences,
        goals,
        content: onboardingContent.content,
        recommendations: onboardingContent.recommendations,
        nextSteps: onboardingContent.nextSteps,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      onboarding: {
        content: onboardingContent.content,
        recommendations: onboardingContent.recommendations,
        nextSteps: onboardingContent.nextSteps,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 