import { LeadData } from "@/types";

export function calculateScore(data: LeadData) {
    let serviceScore = 0;
    let fundingScore = 0;
    let urgencyScore = 0;
    let penalties = 0;
    const flags: string[] = [];

    // 1. Service Type Scoring
    // Replacement/Storm is High Value, Repair is High Volume
    if (data.serviceType === "Replacement") serviceScore = 30;
    else if (data.serviceType === "Storm Damage") serviceScore = 30;
    else if (data.serviceType === "Repair") serviceScore = 20;
    else serviceScore = 5; // Other

    // Helper: Is this a big job?
    const isBigJob = data.serviceType === "Replacement" || data.serviceType === "Storm Damage";

    // 2. Funding Scoring (CONTEXT AWARE)
    const f = data.fundingSource;

    if (f.includes("Insurance Approved")) fundingScore = 40; // Gold standard
    else if (f.includes("Cash >$20k")) fundingScore = 35;
    else if (f.includes("Cash $10k-$20k")) fundingScore = 30;
    else if (f.includes("Finance >$300/mo")) fundingScore = 30;
    else if (f.includes("Insurance Waiting")) fundingScore = 25;
    else if (f.includes("Finance $150-$300/mo")) fundingScore = 20;

    // -- The Fix: Context Aware Budgeting --

    else if (f.includes("Cash $5k-$10k")) {
        if (isBigJob) {
            fundingScore = 10; // Low for a full roof
            flags.push("Low Budget for Full Roof");
        } else {
            fundingScore = 30; // Excellent budget for a repair
        }
    }
    else if (f.includes("Cash <$5k")) {
        if (isBigJob) {
            fundingScore = 0;
            penalties += 25; // Critical flag for full roof
            flags.push("Budget too low for Replacement");
        } else {
            fundingScore = 15; // Acceptable for small repair
        }
    }
    else if (f.includes("Finance <$150/mo")) {
        fundingScore = 5;
        if (isBigJob) {
            penalties += 15;
            flags.push("Low Monthly Budget");
        }
    }
    else if (f.includes("Insurance Denied")) {
        fundingScore = 0;
        penalties += 30; // Hard to overturn a denial
        flags.push("Insurance Denied");
    }

    // 3. Urgency / Timeline Scoring
    if (data.activeLeak) {
        urgencyScore += 25; // Active leak is always high priority
    }

    if (data.timeline === "ASAP") urgencyScore += 20;
    else if (data.timeline === "1-3 Months") urgencyScore += 10;
    else if (data.timeline === "Just Researching") {
        urgencyScore = 0;
        // NO PENALTY here anymore.
        flags.push("Timeline Indefinite");
    }

    // 4. Calculate Final Score
    let total = (serviceScore + fundingScore + urgencyScore) - penalties;

    // Cap score between 0 and 100
    total = Math.max(0, Math.min(100, total));

    // Determine Status
    let status: "HOT" | "REVIEW" | "DECLINE" = "REVIEW";

    if (total >= 75) status = "HOT";
    else if (total < 35) status = "DECLINE";

    return {
        score: total,
        status,
        flags,
        breakdown: {
            service: serviceScore,
            funding: fundingScore,
            urgency: urgencyScore,
            penalties
        }
    };
}