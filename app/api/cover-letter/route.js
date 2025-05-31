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

// Helper: Generate ATS-optimized cover letter using Gemini
async function generateCoverLetter(userProfile, jobDescription, companyName, jobTitle) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;
  const prompt = `You are an expert cover letter writer. Generate a personalized, ATS-optimized cover letter for the role of ${jobTitle} at ${companyName}. Use this user profile: ${JSON.stringify(userProfile)} and job description: ${jobDescription}. Return as JSON: {content: string, feedback: string, improvementTip: string}.`;
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
    const { userId, jobDescription, companyName, jobTitle } = await req.json();
    if (!userId || !jobDescription || !companyName || !jobTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Generate ATS-optimized cover letter
    const coverLetter = await generateCoverLetter(userProfile, jobDescription, companyName, jobTitle);
    // 3. Store cover letter data
    const storedCoverLetter = await prisma.coverLetter.create({
      data: {
        userId,
        content: coverLetter.content,
        jobDescription,
        companyName,
        jobTitle,
        status: 'draft',
      },
    });
    // 4. Return structured response
    return NextResponse.json({
      userId,
      coverLetter: {
        content: coverLetter.content,
        feedback: coverLetter.feedback,
        improvementTip: coverLetter.improvementTip,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 