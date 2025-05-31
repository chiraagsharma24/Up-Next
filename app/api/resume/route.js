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

// Helper: Generate ATS-optimized resume content using Gemini
async function generateResumeContent(userProfile, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert resume writer. Generate an ATS-optimized, industry-standard resume for the role of ${targetRole} in the ${industry} industry. Use this user profile: ${JSON.stringify(userProfile)}. Return as JSON: {content: string, feedback: string, improvementTip: string}.`;
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

// Helper: Evaluate resume with Gemini
async function evaluateResume(resumeContent, targetRole, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert resume evaluator. Evaluate this resume for the role of ${targetRole} in the ${industry} industry:\n${JSON.stringify(resumeContent)}\nReturn as JSON: {atsScore: number (0-100), feedback: string, improvementTip: string}.`;
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
    // 2. Generate ATS-optimized resume content
    const resumeContent = await generateResumeContent(userProfile, targetRole, industry);
    // 3. Evaluate resume
    const evaluation = await evaluateResume(resumeContent, targetRole, industry);
    // 4. Store resume data
    const storedResume = await prisma.resume.create({
      data: {
        userId,
        content: resumeContent.content,
        targetRole,
        industry,
        status: 'draft',
      },
    });
    // 5. Return structured response
    return NextResponse.json({
      userId,
      resume: {
        content: resumeContent.content,
        feedback: resumeContent.feedback,
        improvementTip: resumeContent.improvementTip,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 