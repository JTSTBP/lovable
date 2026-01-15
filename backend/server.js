
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:4173",
        "https://jobsterritory.in",
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());

// --- UPLOAD CONFIG ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });
app.get("/", (req, res) => {
    res.send("lovable is runningg in server...");
});


app.use('/uploads', express.static('uploads'));

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use BACKEND_URL from env if set (crucial for emails to have public links)
    // Otherwise fall back to request host (works for local app usage but not emails)
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({ url });
});
// ---------------------

// --- AUTH PROXY ROUTES ---
// Login Proxy
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_PUBLISHABLE_KEY
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Login Proxy Error (Supabase):', data);
            // Thoroughly check for any potential error message from Supabase
            const message = data.error_description || data.message || data.msg || data.error || (data.code ? `Supabase error: ${data.code}` : 'Invalid login credentials');
            return res.status(response.status).json({ success: false, error: message, code: data.code });
        }
        res.json({ success: true, ...data });
    } catch (error) {
        console.error('Login Proxy Error (Internal):', error);
        res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
    }
});

// Signup Proxy
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_PUBLISHABLE_KEY
            },
            body: JSON.stringify({
                email,
                password,
                data: { full_name: fullName }
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Signup Proxy Error (Supabase):', data);
            const message = data.error_description || data.message || data.msg || data.error || (data.code ? `Supabase error: ${data.code}` : 'Sign up failed');
            return res.status(response.status).json({ success: false, error: message, code: data.code });
        }
        res.json({ success: true, ...data });
    } catch (error) {
        console.error('Signup Proxy Error (Internal):', error);
        res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
    }
});

// Logout Proxy
app.post('/api/auth/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/logout?scope=global`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_PUBLISHABLE_KEY,
                'Authorization': authHeader
            }
        });
        if (!response.ok) {
            const data = await response.json();

            // If session is not found or it's a 403 session error, the user is effectively logged out
            if (response.status === 403 && (data.error_code === 'session_not_found' || data.msg?.includes('session_id claim'))) {
                console.log('Session already gone, treating logout as success.');
                return res.json({ success: true, message: 'Logged out successfully' });
            }

            console.error('Logout Proxy Error (Supabase):', data);
            const message = data.error_description || data.message || data.msg || data.error || (data.code ? `Supabase error: ${data.code}` : 'Logout failed');
            return res.status(response.status).json({ success: false, error: message, code: data.code });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout Proxy Error (Internal):', error);
        res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
    }
});
// ---------------------

// Google OAuth Configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/auth/google/callback`
);

// 1. Auth Route: Redirect to Google
app.get('/api/auth/google', (req, res) => {
    const { userId } = req.query;
    console.log('🔗 Google Auth Start - userId:', userId);

    if (!userId || userId === 'undefined') {
        return res.status(400).send('User ID is required for authentication linkage.');
    }

    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: userId
    });

    res.redirect(url);
});

// 2. Callback Route: Exchange code for tokens
app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state } = req.query;
    console.log('🔗 Google Callback - Code:', !!code, 'State (userId):', state);

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        if (!email) {
            throw new Error('No email found in user info');
        }

        // Check if account exists
        const existing = await prisma.account.findFirst({
            where: {
                userId: state || "demo-user-123",
                email: email
            }
        });

        if (existing) {
            await prisma.account.update({
                where: { id: existing.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isConnected: true
                }
            });
        } else {
            await prisma.account.create({
                data: {
                    userId: state || "demo-user-123",
                    email: email,
                    provider: 'google',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isConnected: true
                }
            });
        }

        console.log(`✅ Account connected: ${email}`);
        res.redirect(`${process.env.FRONTEND_URL}/accounts?success=true`);

    } catch (error) {
        console.error('💥 OAuth Error:', error);
        fs.appendFileSync('backend_error.log', `[${new Date().toISOString()}] Google OAuth Error: ${error?.message || error}\n${error?.stack || ''}\n`);
        res.redirect(`${process.env.FRONTEND_URL}/accounts?error=auth_failed`);
    }
});

// Get all Accounts
app.get('/api/accounts', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('🔍 Fetching Accounts for userId:', userId);

        if (!userId || userId === 'undefined') {
            console.log('⚠️ No userId provided, returning empty list for security.');
            return res.json([]);
        }

        const accounts = await prisma.account.findMany({
            where: { userId },
            orderBy: {
                createdAt: 'desc',
            }
        });
        res.json(accounts);
    } catch (error) {
        console.error('💥 DATABASE ERROR:', error);
        res.status(500).json({ error: "Failed to fetch accounts" });
    }
});

// Delete Account
app.delete('/api/accounts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.account.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('💥 DELETE ACCOUNT ERROR:', error);
        res.status(500).json({ error: "Failed to delete account" });
    }
});

// Test route
app.get('/api/status', (req, res) => {
    res.json({ status: "Online" });
});



// Microsoft Graph Client
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

// Microsoft OAuth Configuration
const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;

const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MS_REDIRECT_URI = `${process.env.BACKEND_URL}/api/auth/outlook/callback`;

// 3. Auth Route: Redirect to Microsoft
app.get('/api/auth/outlook', (req, res) => {
    const { userId } = req.query;
    console.log('🔗 Outlook Auth Start - userId:', userId);

    if (!userId || userId === 'undefined') {
        return res.status(400).send('User ID is required for authentication linkage.');
    }

    const scopes = [
        'User.Read',
        'Mail.Read',
        'Mail.Send',
        'offline_access'
    ].join(' ');

    const state = userId;
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;

    res.redirect(url);
});

// 4. Callback Route: Exchange code for tokens (Microsoft)
app.get('/api/auth/outlook/callback', async (req, res) => {
    const { code, state } = req.query;
    console.log('🔗 Outlook Callback - Code:', !!code, 'State (userId):', state);

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: MS_CLIENT_ID,
                client_secret: MS_CLIENT_SECRET,
                code,
                redirect_uri: MS_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            throw new Error(tokens.error_description || tokens.error);
        }

        // Get user info using the access token
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });

        const userData = await userResponse.json();
        const email = userData.mail || userData.userPrincipalName; // Fallback to UPN if mail is null

        if (!email) {
            throw new Error('No email found in user info');
        }

        // Check if account exists
        const existing = await prisma.account.findFirst({
            where: {
                userId: state || "demo-user-123",
                email: email
            }
        });

        if (existing) {
            await prisma.account.update({
                where: { id: existing.id },
                data: {
                    provider: 'outlook', // Ensure provider is updated if they switch or reconnect
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isConnected: true
                }
            });
        } else {
            await prisma.account.create({
                data: {
                    userId: state || "demo-user-123",
                    email: email,
                    provider: 'outlook',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    isConnected: true
                }
            });
        }

        console.log(`✅ Outlook Account connected: ${email}`);
        res.redirect(`${process.env.FRONTEND_URL}/accounts?success=true`);

    } catch (error) {
        console.error('💥 Outlook OAuth Error:', error);
        fs.appendFileSync('backend_error.log', `[${new Date().toISOString()}] Outlook OAuth Error: ${error?.message || error}\n${error?.stack || ''}\n`);
        res.redirect(`${process.env.FRONTEND_URL}/accounts?error=auth_failed`);
    }
});


// Create a Lead
app.post('/api/leads', async (req, res) => {
    console.log('📝 RECEIVED DATA:', req.body);
    const { email, leadName, fullName, company, linkedinUrl, industry } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const lead = await prisma.lead.create({
            data: {
                email,
                leadName,
                fullName,
                company,
                linkedinUrl,
                industry,
                industry,
                userId: req.body.userId || "demo-user-123",
            },
        });
        res.json(lead);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Lead with this email already exists" });
        }
        console.error('💥 DATABASE ERROR:', error);
        res.status(500).json({ error: "Failed to create lead" });
    }
});

// Get all Leads
app.get('/api/leads', async (req, res) => {
    try {
        const { userId } = req.query;
        const where = userId ? { userId } : {};

        const leads = await prisma.lead.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            }
        });
        res.json(leads);
    } catch (error) {
        console.error('💥 DATABASE ERROR:', error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});

// Update a Lead
app.put('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const { email, leadName, fullName, company, linkedinUrl, industry } = req.body;

    try {
        const lead = await prisma.lead.update({
            where: { id },
            data: {
                email,
                leadName,
                fullName,
                company,
                linkedinUrl,
                industry,
            }
        });
        res.json(lead);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: "Lead with this email already exists" });
        }
        console.error('💥 UPDATE LEAD ERROR:', error);
        res.status(500).json({ error: "Failed to update lead" });
    }
});

// Delete a Lead
app.delete('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.lead.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('💥 DELETE LEAD ERROR:', error);
        res.status(500).json({ error: "Failed to delete lead" });
    }
});

// Create a Campaign
app.post('/api/campaigns', async (req, res) => {
    console.log('📝 RECEIVED CAMPAIGN DATA:', req.body);
    const { name, accountId, scheduledAt, steps, leads } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Campaign name is required" });
    }

    try {
        // 1. Create the Campaign
        const campaign = await prisma.campaign.create({
            data: {
                userId: req.body.userId || "demo-user-123",
                name,
                accountId, // Can be null
                status: 'draft', // Default status
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                // Create associated steps
                steps: {
                    create: steps.map((step, index) => ({
                        stepOrder: index + 1,
                        subject: step.subject,
                        body: step.body,
                        backgroundImage: step.backgroundImage,
                        attachments: step.attachments || [],
                        delayDays: step.delayDays,
                        variants: {
                            create: (step.abTestEnabled && step.abVariants) ? step.abVariants.map(v => ({
                                variantName: v.variantName,
                                subject: v.subject,
                                body: v.body,
                                backgroundImage: v.backgroundImage,
                                attachments: v.attachments || [],
                                trafficSplit: 50
                            })) : []
                        }
                    }))
                }
            },
        });

        // 2. Link leads to this campaign (if any)
        if (leads && leads.length > 0) {
            for (const leadData of leads) {
                // Scenario A: Lead has an ID (Explicitly selected existing lead)
                if (leadData.id) {
                    await prisma.lead.update({
                        where: { id: leadData.id },
                        data: {
                            campaignId: campaign.id,
                            status: 'pending',       // Reset status for new campaign
                            currentStepId: null,     // Reset flow
                            nextStepDueAt: null      // Reset schedule
                        }
                    }).catch(e => console.log(`Failed to link existing lead ${leadData.id}:`, e));
                    continue; // Done with this lead
                }

                // Scenario B: Lead is new (from CSV) OR Existing but ID not provided (checking by email)
                // We should check if email exists to avoid duplicates or errors
                const existingLead = await prisma.lead.findFirst({
                    where: {
                        userId: "demo-user-123",
                        email: leadData.email
                    }
                });

                if (existingLead) {
                    // Update existing lead to this new campaign
                    await prisma.lead.update({
                        where: { id: existingLead.id },
                        data: {
                            campaignId: campaign.id,
                            status: 'pending',
                            currentStepId: null,
                            nextStepDueAt: null
                        }
                    }).catch(e => console.log(`Failed to relink existing lead by email ${leadData.email}:`, e));
                } else {
                    // Create NEW lead
                    await prisma.lead.create({
                        data: {
                            userId: req.body.userId || "demo-user-123",
                            email: leadData.email,
                            leadName: leadData.leadName,
                            fullName: leadData.fullName,
                            company: leadData.company,
                            linkedinUrl: leadData.linkedinUrl,
                            industry: leadData.industry,
                            campaignId: campaign.id
                        }
                    }).catch(e => console.log(`Skipping failed lead creation: ${leadData.email}`, e));
                }
            }
        }

        res.json(campaign);
    } catch (error) {
        console.error('💥 DATABASE ERROR:', error);
        res.status(500).json({ error: "Failed to create campaign" });
    }
});

// Get all Campaigns
app.get('/api/campaigns', async (req, res) => {
    try {
        const { userId } = req.query;
        const where = userId ? { userId } : {};
        const campaigns = await prisma.campaign.findMany({ where });
        res.json(campaigns);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch campaigns" });
    }
});


// Get Single Campaign
app.get('/api/campaigns/:id', async (req, res) => {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: req.params.id },
            include: {
                steps: {
                    orderBy: { stepOrder: 'asc' },
                    include: { variants: true }
                },
                leads: true
            }
        });
        if (!campaign) return res.status(404).json({ error: "Campaign not found" });
        res.json(campaign);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch campaign" });
    }
});

// Update Campaign
app.put('/api/campaigns/:id', async (req, res) => {
    const { id } = req.params;
    const { name, accountId, scheduledAt, steps, leads } = req.body;

    try {
        // 1. Update basic fields
        const campaign = await prisma.campaign.update({
            where: { id },
            data: {
                name,
                accountId,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            }
        });

        // 2. Update steps (Delete all and recreate - simplest for now)
        if (steps) {
            await prisma.campaignStep.deleteMany({ where: { campaignId: id } });
            for (let i = 0; i < steps.length; i++) {
                const stepData = steps[i];
                const createdStep = await prisma.campaignStep.create({
                    data: {
                        campaignId: id,
                        stepOrder: i + 1,
                        subject: stepData.subject,
                        body: stepData.body,
                        delayDays: stepData.delayDays
                    }
                });

                if (stepData.abTestEnabled && stepData.abVariants && stepData.abVariants.length > 0) {
                    await prisma.campaignStepVariant.createMany({
                        data: stepData.abVariants.map(v => ({
                            stepId: createdStep.id,
                            variantName: v.variantName,
                            subject: v.subject,
                            body: v.body,
                            trafficSplit: 50
                        }))
                    });
                }
            }
        }

        // 3. Link NEW leads or Re-link existing leads
        if (leads && leads.length > 0) {
            for (const leadData of leads) {
                // Scenario A: Lead has an ID (Explicitly selected existing lead)
                if (leadData.id) {
                    await prisma.lead.update({
                        where: { id: leadData.id },
                        data: { campaignId: id }
                    }).catch(e => console.log(`Failed to link existing lead ${leadData.id}:`, e));
                    continue;
                }

                // Scenario B: Lead is new (from CSV) OR Existing but ID not provided (checking by email)
                const existingLead = await prisma.lead.findFirst({
                    where: {
                        userId: req.body.userId || "demo-user-123",
                        email: leadData.email
                    }
                });

                if (existingLead) {
                    // Check if already in this campaign to avoid redundant updates? 
                    // But if user explicitly added it in UI, let's ensure it's linked.
                    if (existingLead.campaignId !== id) {
                        await prisma.lead.update({
                            where: { id: existingLead.id },
                            data: { campaignId: id }
                        }).catch(e => console.log(`Failed to relink existing lead by email ${leadData.email}:`, e));
                    }
                } else {
                    // Create NEW lead
                    await prisma.lead.create({
                        data: {
                            userId: req.body.userId || "demo-user-123",
                            email: leadData.email,
                            leadName: leadData.leadName,
                            fullName: leadData.fullName,
                            company: leadData.company,
                            linkedinUrl: leadData.linkedinUrl,
                            industry: leadData.industry,
                            campaignId: id
                        }
                    }).catch(e => console.log(`Skipping failed lead creation during update: ${leadData.email}`, e));
                }
            }
        }


        res.json(campaign);
    } catch (error) {
        console.error('💥 UPDATE ERROR:', error);
        res.status(500).json({ error: "Failed to update campaign" });
    }
});

// Toggle Campaign Status
app.patch('/api/campaigns/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const campaign = await prisma.campaign.update({
            where: { id },
            data: { status }
        });
        res.json(campaign);


    } catch (error) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

// Delete Campaign
app.delete('/api/campaigns/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Unlink leads instead of deleting them, so they return to the pool
        await prisma.lead.updateMany({
            where: { campaignId: id },
            data: { campaignId: null }
        });

        await prisma.campaign.delete({ where: { id } });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ error: "Failed to delete campaign" });
    }
});

// --- EMAIL TEMPLATE ROUTES ---

app.get('/api/templates', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('🔍 Fetching Templates for userId:', userId);

        if (!userId || userId === 'undefined') {
            console.log('⚠️ No userId provided, returning empty list for security.');
            return res.json([]);
        }

        const templates = await prisma.emailTemplate.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch templates" });
    }
});

app.post('/api/templates', async (req, res) => {
    const { name, subject, body, backgroundImage, attachments } = req.body;
    const userId = req.body.userId;
    console.log('📝 Creating Template for userId:', userId, req.body);
    try {
        const template = await prisma.emailTemplate.create({
            data: {
                userId: userId || "demo-user-123",
                name,
                subject,
                body,
                backgroundImage,
                attachments: attachments || []
            }
        });
        res.json(template);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create template" });
    }
});

app.put('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    const { name, subject, body, backgroundImage, attachments } = req.body;
    try {
        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                name,
                subject,
                body,
                backgroundImage,
                attachments: attachments || []
            }
        });
        res.json(template);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update template" });
    }
});

app.delete('/api/templates/:id', async (req, res) => {
    try {
        await prisma.emailTemplate.delete({
            where: { id: req.params.id }
        });
        res.json({ message: "Template deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete template" });
    }
});


// Get Campaign Analytics
app.get('/api/campaigns/:id/analytics', async (req, res) => {
    const { id } = req.params;
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { leads: true }
        });

        if (!campaign) return res.status(404).json({ error: "Campaign not found" });

        // Build Daily Stats from Leads
        // Group by status update date or creation date?
        // Since we don't have a separate Events table yet, we'll approximate using Lead.updatedAt
        // This is imperfect but works for MVP.
        const statsMap = {};

        campaign.leads.forEach(lead => {
            const date = lead.updatedAt.toISOString().split('T')[0];
            if (!statsMap[date]) {
                statsMap[date] = { date, sent: 0, opened: 0, replied: 0, clicked: 0 }; // Clicked not tracked yet
            }
            // If status is 'sent', it counts as sent. If 'replied', it counts as sent + opened + replied (roughly)
            if (['sent', 'opened', 'replied'].includes(lead.status)) statsMap[date].sent++;
            if (['opened', 'replied'].includes(lead.status)) statsMap[date].opened++;
            if (['replied'].includes(lead.status)) statsMap[date].replied++;
        });

        const dailyStats = Object.values(statsMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Return structure matching Frontend expectations
        res.json({
            campaign: {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                total_sent: campaign.totalSent || 0,
                total_opened: campaign.totalOpened || 0,
                total_replied: campaign.totalReplied || 0,
                created_at: campaign.createdAt
            },
            dailyStats: dailyStats,
            events: [], // TODO: Implement granular event tracking
            variantStats: [] // TODO: Implement A/B testing
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

// Get Global Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        const where = userId ? { userId } : {};

        const campaigns = await prisma.campaign.findMany({ where });
        const totalLeads = await prisma.lead.count({ where });

        const aggregatedStats = campaigns.reduce(
            (acc, campaign) => ({
                totalSent: acc.totalSent + (campaign.totalSent || 0),
                totalOpened: acc.totalOpened + (campaign.totalOpened || 0),
                totalReplied: acc.totalReplied + (campaign.totalReplied || 0),
            }),
            { totalSent: 0, totalOpened: 0, totalReplied: 0 }
        );

        res.json({
            ...aggregatedStats,
            totalLeads
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

// Get Dashboard Activity
app.get('/api/dashboard/activity', async (req, res) => {
    try {
        const { userId } = req.query;
        const where = userId ? { userId } : {};

        const [recentLeads, recentCampaigns] = await Promise.all([
            prisma.lead.findMany({
                where,
                take: 5,
                orderBy: { updatedAt: 'desc' },
                include: { campaign: true }
            }),
            prisma.campaign.findMany({
                where,
                take: 5,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const activity = [
            ...recentLeads.map(lead => ({
                id: lead.id,
                type: 'lead',
                action: 'status_update',
                message: `Lead ${lead.fullName || lead.email} is now ${lead.status}`,
                campaignName: lead.campaign?.name,
                timestamp: lead.updatedAt
            })),
            ...recentCampaigns.map(campaign => ({
                id: campaign.id,
                type: 'campaign',
                action: 'created',
                message: `New campaign "${campaign.name}" created`,
                timestamp: campaign.createdAt
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

        res.json(activity);
    } catch (error) {
        console.error('Dashboard Activity Error:', error);
        res.status(500).json({ error: "Failed to fetch dashboard activity" });
    }
});

// --- BACKGROUND EMAIL SENDER ---

// --- IMAGE HELPER ---
const extractAndAttachImages = async (html) => {
    const attachments = [];
    let processedHtml = html;

    // Find all img tags
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    const usedCids = new Set();

    while ((match = imgRegex.exec(html)) !== null) {
        const fullUrl = match[1];

        // Check if it's a local upload
        if (fullUrl.includes('/uploads/')) {
            const filename = fullUrl.split('/').pop();
            const filePath = path.join('uploads', filename);

            if (fs.existsSync(filePath)) {
                const cid = `img_${filename.replace(/[^a-zA-Z0-9]/g, '')}`;
                if (!usedCids.has(cid)) {
                    const content = fs.readFileSync(filePath);
                    const ext = path.extname(filename).toLowerCase();
                    const contentType = ext === '.png' ? 'image/png' :
                        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                            ext === '.gif' ? 'image/gif' : 'application/octet-stream';

                    attachments.push({
                        filename,
                        content: content.toString('base64'),
                        contentType,
                        cid
                    });
                    usedCids.add(cid);
                }
                processedHtml = processedHtml.replace(fullUrl, `cid:${cid}`);
            }
        }
    }

    return { processedHtml, attachments };
};

const startEmailSender = () => {
    console.log("⏰ Starting Email Sender Loop...");
    setInterval(async () => {
        try {
            // Check connection - handle P1017 by explicit connect if needed
            try {
                await prisma.$connect();
            } catch (connErr) {
                console.error("🚩 Database Connection Failed in Loop:", connErr.message);
                return; // Skip this iteration
            }

            console.log("🔄 Checking for emails to send...");

            // 1. Find ACTIVE campaigns
            const activeCampaigns = await prisma.campaign.findMany({
                where: { status: 'active' },
                include: {
                    account: true,
                    steps: {
                        orderBy: { stepOrder: 'asc' },
                        include: { variants: true }
                    }
                }
            });

            for (const campaign of activeCampaigns) {
                if (!campaign.account || !campaign.account.isConnected) {
                    console.log(`⚠️ Campaign ${campaign.name} has no connected account.`);
                    continue;
                }

                // 2. Find eligible leads
                // A lead is eligible if:
                // - It is in 'pending' status (for step 1) OR 'sent' status (waiting for step 2+)
                // - AND nextStepDueAt is null (start immediately) OR past due

                const leadsToProcess = await prisma.lead.findMany({
                    where: {
                        campaignId: campaign.id,
                        status: { in: ['pending', 'sent'] },
                        OR: [
                            { nextStepDueAt: null },
                            { nextStepDueAt: { lte: new Date() } }
                        ]
                    },
                    take: 10 // Process in batches
                });

                for (const lead of leadsToProcess) {
                    // Determine which step to send
                    let stepToSend = null;

                    if (lead.status === 'pending') {
                        // First step
                        stepToSend = campaign.steps[0];
                    } else if (lead.currentStepId) {
                        // Find NEXT step
                        const currentStepIndex = campaign.steps.findIndex(s => s.id === lead.currentStepId);
                        if (currentStepIndex !== -1 && currentStepIndex + 1 < campaign.steps.length) {
                            stepToSend = campaign.steps[currentStepIndex + 1];
                        }
                    }

                    if (!stepToSend) {
                        // No more steps, mark completed?
                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: { status: 'replied' } // Placeholder for "completed" or just leave as sent
                        });
                        continue;
                    }


                    // SEND EMAIL
                    console.log(`🚀 Sending email to ${lead.email} via ${campaign.account.provider}...`);

                    try {
                        const processContent = (text) => {
                            if (!text) return "";
                            let content = text
                                .replace(/{{leadName}}/g, lead.leadName || '')
                                .replace(/{{fullName}}/g, lead.fullName || '')
                                .replace(/{{firstName}}/g, lead.leadName?.split(' ')[0] || '') // Compatibility
                                .replace(/{{lastName}}/g, lead.leadName?.split(' ').slice(1).join(' ') || '') // Compatibility
                                .replace(/{{company}}/g, lead.company || 'your company')
                                .replace(/{{linkedinUrl}}/g, lead.linkedinUrl || '')
                                .replace(/{{industry}}/g, lead.industry || '');

                            // Handle Unsubscribe
                            const unsubLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/unsubscribe?token=${lead.unsubscribeToken || lead.id}`;
                            content = content.replace(/{{unsubscribe}}/g, `<a href="${unsubLink}" style="color: #666; font-size: 12px;">Unsubscribe</a>`);

                            return content;
                        };

                        let subjectToSend = stepToSend.subject;
                        let bodyToSend = stepToSend.body;
                        let bgImageToSend = stepToSend.backgroundImage;
                        let stepAttachments = stepToSend.attachments || [];

                        // A/B Test Logic
                        if (stepToSend.variants && stepToSend.variants.length > 0) {
                            const totalOptions = stepToSend.variants.length + 1;
                            const roll = Math.random();
                            const threshold = 1 / totalOptions;

                            if (roll > threshold) {
                                const variantIndex = Math.floor((roll - threshold) / (1 - threshold) * stepToSend.variants.length);
                                const pickedVariant = stepToSend.variants[variantIndex < stepToSend.variants.length ? variantIndex : 0];

                                console.log(`🔀 A/B Test: Selected Variant ${pickedVariant.variantName} for ${lead.email}`);
                                subjectToSend = pickedVariant.subject;
                                bodyToSend = pickedVariant.body;
                                bgImageToSend = pickedVariant.backgroundImage;
                                stepAttachments = pickedVariant.attachments || [];
                            } else {
                                console.log(`🔀 A/B Test: Selected Control (A) for ${lead.email}`);
                            }
                        }

                        const filledSubject = processContent(subjectToSend);
                        let filledBody = processContent(bodyToSend);

                        // Extract inline images
                        const { processedHtml: bodyWithCids, attachments: inlineAttachments } = await extractAndAttachImages(filledBody);
                        let finalHtml = bodyWithCids;
                        let allAttachments = [...inlineAttachments];

                        // Handle Background Image
                        if (bgImageToSend) {
                            const bgFilename = bgImageToSend.split('/').pop();
                            const bgFilePath = path.join('uploads', bgFilename);
                            const bgCid = `bg_${bgFilename.replace(/[^a-zA-Z0-9]/g, '')}`;

                            if (fs.existsSync(bgFilePath)) {
                                const content = fs.readFileSync(bgFilePath);
                                const ext = path.extname(bgFilename).toLowerCase();
                                const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

                                allAttachments.push({
                                    filename: bgFilename,
                                    content: content.toString('base64'),
                                    contentType,
                                    cid: bgCid
                                });

                                // Wrap content in a div with background
                                finalHtml = `
                            <div style="background-image: url('cid:${bgCid}'); background-size: cover; background-position: center; padding: 40px; min-height: 400px;">
                                <div style="background: rgba(255,255,255,0.9); padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                                    ${finalHtml}
                                </div>
                            </div>
                        `;
                            }
                        }

                        // Add File Attachments
                        if (stepAttachments && stepAttachments.length > 0) {
                            for (const att of stepAttachments) {
                                const filename = att.name;
                                const fileUrl = att.url;
                                const localFilename = fileUrl.split('/').pop();
                                const filePath = path.join('uploads', localFilename);

                                if (fs.existsSync(filePath)) {
                                    const content = fs.readFileSync(filePath);
                                    const ext = path.extname(localFilename).toLowerCase();
                                    const contentType = ext === '.pdf' ? 'application/pdf' :
                                        ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                                            'application/octet-stream';

                                    allAttachments.push({
                                        filename,
                                        content: content.toString('base64'),
                                        contentType,
                                        cid: `att_${localFilename.replace(/[^a-zA-Z0-9]/g, '')}`
                                    });
                                }
                            }
                        }

                        if (campaign.account.provider === 'google') {
                            await sendGmail(campaign.account, lead.email, filledSubject, finalHtml, allAttachments);
                        } else if (campaign.account.provider === 'outlook') {
                            await sendOutlook(campaign.account, lead.email, filledSubject, finalHtml, allAttachments);
                        }

                        // Success! Update Lead
                        // Calculate next due date if there is a next step
                        const currentStepIndex = campaign.steps.findIndex(s => s.id === stepToSend.id);
                        let nextDue = null;
                        if (currentStepIndex + 1 < campaign.steps.length) {
                            const nextStep = campaign.steps[currentStepIndex + 1];
                            const nextDate = new Date();
                            nextDate.setDate(nextDate.getDate() + (nextStep.delayDays || 1));
                            nextDue = nextDate;
                        }

                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: {
                                status: 'sent',
                                currentStepId: stepToSend.id,
                                nextStepDueAt: nextDue,
                                updatedAt: new Date()
                            }
                        });

                        // Update Stats
                        await prisma.campaign.update({
                            where: { id: campaign.id },
                            data: { totalSent: { increment: 1 } }
                        });

                    } catch (err) {
                        console.error(`❌ Failed to send to ${lead.email}:`, err);
                        // Maybe update status to 'bounced' or retry later
                    }
                }
            }

        } catch (error) {
            console.error("💥 Sender Loop Error:", error);
            if (error.code === 'P1017') {
                console.log("🔌 Connection lost. Will attempt reconnect in next iteration.");
                await prisma.$disconnect().catch(() => { });
            }
        }
    }, 10 * 1000); // Run every 10 seconds
};


// --- SENDING HELPERS ---

async function sendGmail(account, to, subject, body, attachments = []) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    // Set refresh token and get fresh access token
    oauth2Client.setCredentials({
        refresh_token: account.refreshToken,
        access_token: account.accessToken
    });

    try {
        // Refresh the access token to ensure it's valid
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);

        // Update the database with new tokens if they changed
        if (credentials.access_token && credentials.access_token !== account.accessToken) {
            await prisma.account.update({
                where: { id: account.id },
                data: {
                    accessToken: credentials.access_token,
                    refreshToken: credentials.refresh_token || account.refreshToken
                }
            });
            console.log(`✅ Gmail token refreshed for ${account.email}`);
        }
    } catch (refreshError) {
        console.error(`❌ Gmail token refresh failed for ${account.email}:`, refreshError.message);
        throw new Error('Failed to refresh Gmail authentication. Please reconnect your account.');
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const boundary = `bluebird_boundary_${Date.now()}`;

    let message = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/related; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(body).toString('base64'),
        ''
    ];

    for (const att of attachments) {
        message.push(`--${boundary}`);
        message.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
        message.push(`Content-ID: <${att.cid}>`);
        message.push('Content-Transfer-Encoding: base64');
        message.push('Content-Disposition: inline');
        message.push('');
        message.push(att.content);
        message.push('');
    }

    message.push(`--${boundary}--`);

    const rawMessage = message.join('\r\n');
    const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
    });
}

async function sendOutlook(account, to, subject, body, attachments = []) {
    let accessToken = account.accessToken;

    try {
        // Refresh Token Flow
        // We attempt to get a fresh token every time for robust delivery, 
        // or we could check expiration if we stored it. 
        console.log(`Token refresh attempt for ${account.email}`);
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                refresh_token: account.refreshToken,
                grant_type: 'refresh_token',
            })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            console.error('❌ Outlook Refresh Error:', tokens.error_description || tokens.error);
            // If invalid_grant, user needs to reconnect.
        } else if (tokens.access_token) {
            accessToken = tokens.access_token;
            // Update DB with new tokens
            await prisma.account.update({
                where: { id: account.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || account.refreshToken
                }
            });
            console.log(`✅ Token refreshed for ${account.email}`);
        }
    } catch (refreshErr) {
        console.error('⚠️ Token refresh request failed:', refreshErr);
    }

    const client = Client.init({
        authProvider: (done) => done(null, accessToken)
    });

    const outlookAttachments = attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.contentType,
        contentBytes: att.content,
        contentId: att.cid,
        isInline: true
    }));

    const sendMail = {
        message: {
            subject: subject,
            body: {
                contentType: 'HTML',
                content: body
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to
                    }
                }
            ],
            attachments: outlookAttachments
        },
        saveToSentItems: true
    };

    // Single Send Call
    try {
        await client.api('/me/sendMail').post(sendMail);
        console.log(`✅ Email sent to ${to} via Outlook`);
    } catch (err) {
        console.error(`❌ Outlook Send API Error for ${to}:`, err.response?.data || err.message || err);
        throw err;
    }
}

startEmailSender();


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

