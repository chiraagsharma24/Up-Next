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

// Helper: Generate real-world career path visualizations using Gemini
async function generateCareerPath(userProfile, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert career path analyst. Generate a real-world career path visualization for the role of ${targetRole} in the ${industry} industry. Use this user profile: ${JSON.stringify(userProfile)}. Return as JSON: {milestones: string[], requiredSkills: string[], estimatedCompletionTime: string, progressTracking: string}.`;
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
    // 2. Generate real-world career path visualizations
    const careerPath = await generateCareerPath(userProfile, targetRole, industry);
    // 3. Store career path data
    const storedCareerPath = await prisma.careerPath.create({
      data: {
        userId,
        targetRole,
        industry,
        milestones: careerPath.milestones,
        requiredSkills: careerPath.requiredSkills,
        estimatedCompletionTime: careerPath.estimatedCompletionTime,
        progressTracking: careerPath.progressTracking,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      careerPath: {
        milestones: careerPath.milestones,
        requiredSkills: careerPath.requiredSkills,
        estimatedCompletionTime: careerPath.estimatedCompletionTime,
        progressTracking: careerPath.progressTracking,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 