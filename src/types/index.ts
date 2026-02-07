import { z } from "zod";

export const LeadSchema = z.object({
    // Step 1: Basics
    serviceType: z.enum(["Replacement", "Storm Damage", "Repair", "Other"]),
    propertyType: z.enum(["Residential", "Commercial"]),
    zipCode: z.string().min(5, "Valid ZIP required"),

    // Step 2: Urgency
    activeLeak: z.boolean(),

    // Step 3: Funding
    // We'll flatten the funding selection into a single "Scenario" for simplicity in scoring,
    // or keep strict fields. Based on the "Exclusive Paths" requirement, let's use a discriminated union or just a simple enum if the UI serves it that way.
    // The user listed specific funding scenarios. Let's make that an enum.
    fundingSource: z.enum([
        "Insurance Approved",
        "Insurance Waiting",
        "Cash >$20k",
        "Cash $10k-$20k",
        "Cash $5k-$10k",
        "Cash <$5k", // Added for completeness/penalty check
        "Finance >$300/mo",
        "Finance $150-$300/mo",
        "Finance <$150/mo", // Added for penalty check
        "Not Sure",
        "Just Researching", // For penalty check
        "Insurance Denied", // Added for penalty check
    ]),

    // Step 4: Roof Details
    roofSteepness: z.enum(["Flat", "Low Slope", "Steep", "Very Steep", "Unsure"]),
    stories: z.enum(["1", "2", "3+"]),

    // Step 5: Timeline
    timeline: z.enum(["ASAP", "1-3 Months", "3+ Months", "Just Researching"]), // Overlaps with funding? "Just Researching" + Funding Unknown is a flag.

    // Step 6: Contact
    fullName: z.string().min(2, "Name required"),
    phone: z.string().min(10, "Phone required"),
    email: z.string().email("Invalid email"),
    consent: z.boolean().refine((val) => val === true, "Must accept terms"),
});

export type LeadData = z.infer<typeof LeadSchema>;

export type LeadStatus = "HOT" | "REVIEW" | "DECLINE";

export interface ScoreResult {
    score: number;
    status: LeadStatus;
    flags: string[];
    breakdown: {
        service: number;
        funding: number;
        urgency: number;
        penalties: number;
    };
}
