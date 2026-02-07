import { NextRequest, NextResponse } from "next/server";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { Resend } from "resend";
import { LeadSchema } from "@/types";
import { calculateScore } from "@/lib/scoring";

export async function POST(req: NextRequest) {
    console.log("--- STARTING PROCESS ---");

    try {
        const rawBody = await req.json();

        // 1. Validate
        const result = LeadSchema.safeParse(rawBody);
        if (!result.success) {
            console.error("Validation Error:", result.error);
            return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 });
        }
        const lead = result.data;

        // 2. Score (Get Flags & Smart Context)
        const { score, status, breakdown, flags } = calculateScore(lead);
        const recommendedAction = status === "HOT" ? "Call Immediately" : "Manual Review";
        const flagsString = flags.length > 0 ? flags.join(", ") : "None";

        console.log(`Lead Scored: ${status} (${score}) - Flags: ${flagsString}`);

        // 3. Logic: Split Funding Source (FIXED TYPE ERROR HERE)
        let fundingMethod: string = lead.fundingSource;
        let claimStatus = "N/A";

        if (lead.fundingSource.includes("Insurance")) {
            fundingMethod = "Insurance Claim";
            claimStatus = lead.fundingSource.replace("Insurance ", "");
        }

        // 4. Prepare Email Content
        let subjectEmoji = "📋";
        let headerTitle = "REVIEW NEEDED";
        let subjectText = "New Lead — Review Needed";

        if (status === "HOT") {
            subjectEmoji = "🔥";
            headerTitle = "HOT LEAD";
            subjectText = "HOT LEAD — Priority Response";
        } else if (status === "DECLINE") {
            subjectEmoji = "❄️";
            headerTitle = "COLD LEAD";
            subjectText = "New Lead — Low Priority";
        }

        const emailSubject = `${subjectEmoji} ${subjectText} (Score: ${score})`;

        const emailHtml = `
            <h1>${subjectEmoji} ${headerTitle}</h1>
            <p><strong>Score: ${score} / 100</strong></p>
            
            <h3>Lead Details:</h3>
            <p>
                👤 <strong>Name:</strong> ${lead.fullName}<br>
                📧 <strong>Email:</strong> ${lead.email}<br>
                📞 <strong>Phone:</strong> ${lead.phone}<br>
                📍 <strong>Location:</strong> ${lead.zipCode} (${lead.propertyType})<br>
                🛠️ <strong>Service:</strong> ${lead.serviceType}<br>
                ⏳ <strong>Timeline:</strong> ${lead.timeline}<br>
                📐 <strong>Roof Info:</strong> ${lead.roofSteepness}, ${lead.stories} Story<br>
                💧 <strong>Active Leak:</strong> ${lead.activeLeak ? "YES" : "No"}<br>
                💰 <strong>Funding:</strong> ${fundingMethod}<br>
                📝 <strong>Claim Status:</strong> ${claimStatus}<br>
                🚩 <strong>FLAGS:</strong> <span style="color:red; font-weight:bold;">${flagsString}</span>
            </p>

            <h3>📊 Score Breakdown</h3>
            <ul>
                <li><strong>Service:</strong> ${breakdown.service}</li>
                <li><strong>Funding:</strong> ${breakdown.funding}</li>
                <li><strong>Urgency:</strong> ${breakdown.urgency}</li>
                <li><strong>Penalties:</strong> -${breakdown.penalties}</li>
            </ul>

            <hr>
            <p>This lead was automatically scored based on urgency, funding status, and service type.</p>
        `;

        // 5. Google Sheets Logic
        const hasSheetID = !!process.env.GOOGLE_SHEET_ID;
        const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;

        if (hasSheetID && hasEmail && hasKey) {
            try {
                const serviceAccountAuth = new JWT({
                    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });

                const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
                await doc.loadInfo();

                let sheet = doc.sheetsByTitle["Leads"];
                if (!sheet) {
                    sheet = await doc.addSheet({
                        title: "Leads",
                        headerValues: ["Timestamp", "Status", "Score", "Category", "Full Name", "Phone", "Email", "ZIP Code", "Timeline", "Active Leak", "Funding Method", "Insurance Claim Status", "Roof Steepness", "Stories", "Flags", "Recommended Action", "RawPayload"]
                    });
                }

                await sheet.addRow({
                    "Timestamp": new Date().toISOString(),
                    "Status": status,
                    "Score": score,
                    "Category": status,
                    "Full Name": lead.fullName,
                    "Phone": lead.phone,
                    "Email": lead.email,
                    "ZIP Code": lead.zipCode,
                    "Timeline": lead.timeline,
                    "Active Leak": lead.activeLeak ? "Yes" : "No",
                    "Funding Method": fundingMethod,
                    "Insurance Claim Status": claimStatus,
                    "Roof Steepness": lead.roofSteepness,
                    "Stories": lead.stories,
                    "Flags": flagsString,
                    "Recommended Action": recommendedAction,
                    "RawPayload": JSON.stringify(lead)
                });
                console.log("SUCCESS: Row added to Sheet!");
            } catch (sheetError) {
                console.error("SHEET ERROR (Non-fatal):", sheetError);
            }
        }

        // 6. Send Email
        if (process.env.RESEND_API_KEY && process.env.ROOFER_EMAIL) {
            console.log("Attempting to send Email...");
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: 'Roofing Leads <onboarding@resend.dev>',
                to: process.env.ROOFER_EMAIL!,
                subject: emailSubject,
                html: emailHtml
            });
            console.log("SUCCESS: Email sent!");
        }

        return NextResponse.json({ success: true, status, recommendedAction });

    } catch (error) {
        console.error("CRITICAL API ERROR:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}