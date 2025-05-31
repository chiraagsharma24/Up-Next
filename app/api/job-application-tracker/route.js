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

// Helper: Parse application emails using Gmail API (mocked for now)
async function parseGmailEmails(userId) {
  // Mock implementation
  return [
    { subject: 'Application Confirmation', body: 'Your application has been received.' },
    { subject: 'Interview Invitation', body: 'You are invited for an interview.' },
  ];
}

// Helper: Schedule interviews using Calendar API (mocked for now)
async function scheduleInterview(userId, interviewDetails) {
  // Mock implementation
  return { eventId: 'event123', status: 'scheduled' };
}

export async function POST(req) {
  try {
    const { userId, company, position, status, source, appliedDate, jobUrl, description, notes } = await req.json();
    if (!userId || !company || !position || !status || !source || !appliedDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Fetch user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // 2. Parse application emails
    const parsedEmails = await parseGmailEmails(userId);
    // 3. Schedule interviews if applicable
    let interviewEvent = null;
    if (status === 'interview') {
      interviewEvent = await scheduleInterview(userId, { company, position, date: appliedDate });
    }
    // 4. Store job application data
    const storedJobApplication = await prisma.jobApplication.create({
      data: {
        userId,
        company,
        position,
        status,
        source,
        appliedDate,
        jobUrl,
        description,
        notes,
        parsedEmails,
        interviewEvent,
      },
    });
    // 5. Return structured response
    return NextResponse.json({
      userId,
      jobApplication: {
        company,
        position,
        status,
        source,
        appliedDate,
        jobUrl,
        description,
        notes,
        parsedEmails,
        interviewEvent,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
} 