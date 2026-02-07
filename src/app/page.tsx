"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LeadSchema, LeadData, LeadStatus } from "@/types";

// --- ICONS ---
const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
);
const ArrowRight = () => (
  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
);
const ArrowLeft = () => (
  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
);

export default function LeadWizard() {
  const [step, setStep] = useState(1);
  const [submissionStatus, setSubmissionStatus] = useState<LeadStatus | null>(null);
  const [recommendedAction, setRecommendedAction] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fundingCategory, setFundingCategory] = useState<"Insurance" | "Cash" | "Finance" | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<LeadData>({
    resolver: zodResolver(LeadSchema),
    defaultValues: { activeLeak: false },
  });

  const totalSteps = 6;
  const progress = ((step) / totalSteps) * 100;

  const nextStep = async () => {
    let valid = false;
    if (step === 1) valid = await trigger(["serviceType", "propertyType", "zipCode"]);
    if (step === 2) valid = await trigger(["activeLeak"]);
    if (step === 3) valid = await trigger(["fundingSource"]);
    if (step === 4) valid = await trigger(["roofSteepness", "stories"]);
    if (step === 5) valid = await trigger(["timeline"]);

    if (valid || step === 2) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: LeadData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/process-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setSubmissionStatus(result.status);
        setRecommendedAction(result.recommendedAction);
        setStep(totalSteps + 1);
      } else {
        alert("Error: " + (result.error || "Submission failed"));
      }
    } catch (e) {
      alert("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER HELPERS ---

  const SelectionCard = ({ selected, onClick, children, className = "" }: any) => (
    <div
      onClick={onClick}
      className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${selected
          ? "border-sky-600 bg-sky-50 ring-1 ring-sky-600"
          : "border-gray-200 bg-white hover:border-sky-300 hover:bg-gray-50"
        } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-medium ${selected ? "text-sky-900" : "text-gray-700"}`}>
          {children}
        </span>
        {selected && <CheckIcon />}
      </div>
    </div>
  );

  const renderFundingOptions = () => {
    if (!fundingCategory) {
      return (
        <div className="grid grid-cols-1 gap-3 animate-fade-in">
          <SelectionCard onClick={() => setFundingCategory("Insurance")} selected={false}>
            🛡️ Insurance Claim
          </SelectionCard>
          <SelectionCard onClick={() => setFundingCategory("Cash")} selected={false}>
            💰 Cash / Check
          </SelectionCard>
          <SelectionCard onClick={() => setFundingCategory("Finance")} selected={false}>
            💳 Financing / Monthly
          </SelectionCard>
          <div onClick={() => { setValue("fundingSource", "Not Sure"); nextStep(); }} className="text-center text-sm text-gray-500 mt-4 cursor-pointer hover:underline">
            I'm not sure yet
          </div>
        </div>
      );
    }

    let options: string[] = [];
    if (fundingCategory === "Insurance") options = ["Insurance Approved", "Insurance Waiting", "Insurance Denied"];
    if (fundingCategory === "Cash") options = ["Cash >$20k", "Cash $10k-$20k", "Cash $5k-$10k", "Cash <$5k"];
    if (fundingCategory === "Finance") options = ["Finance >$300/mo", "Finance $150-$300/mo", "Finance <$150/mo"];

    return (
      <div className="space-y-4 animate-fade-in">
        <button type="button" onClick={() => setFundingCategory(null)} className="text-sm font-medium text-sky-600 hover:text-sky-800 flex items-center mb-2">
          <ArrowLeft /> Back to options
        </button>
        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => (
            <SelectionCard
              key={opt}
              selected={watch("fundingSource") === opt}
              onClick={() => setValue("fundingSource", opt as any)}
            >
              {opt}
            </SelectionCard>
          ))}
        </div>
      </div>
    );
  };

  // --- SUCCESS SCREEN ---
  if (step > totalSteps && submissionStatus) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-scale-up">
          {submissionStatus === "HOT" && (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔥</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Priority Approved</h2>
              <p className="text-gray-600 mb-8">Your profile matches our priority criteria. Our priority response team has been notified instantly.</p>
              <button className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Book Consultation Now
              </button>
            </>
          )}
          {submissionStatus === "REVIEW" && (
            <>
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📋</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Application Received</h2>
              <p className="text-gray-600 mb-8">We are reviewing your property details to match you with the best specialist.</p>
              <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700 border border-slate-200">
                Status: {recommendedAction}
              </div>
            </>
          )}
          {submissionStatus === "DECLINE" && (
            <>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Received</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Thank you for providing your project details. While this request is outside our current priority scope, we have saved your information and will contact you if availability opens up.
              </p>
              <button onClick={() => window.location.reload()} className="text-sky-600 hover:text-sky-800 font-medium">
                Return to Home
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // --- MAIN FORM ---
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 font-sans">

      {/* Header / Brand Area */}
      <div className="mb-8 text-center">
        <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Fast Quote System</h2>
        <div className="h-1 w-12 bg-sky-500 mx-auto rounded-full"></div>
      </div>

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">

        {/* Modern Progress Bar */}
        <div className="bg-slate-100 h-2 w-full">
          <div className="bg-sky-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="p-8 md:p-10">

          <div className="mb-8">
            <span className="inline-block px-3 py-1 bg-sky-50 text-sky-600 text-xs font-bold rounded-full mb-3">
              Step {step} of {totalSteps}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
              {step === 1 && "Let's start with the basics."}
              {step === 2 && "Is there an active leak?"}
              {step === 3 && "How is this funded?"}
              {step === 4 && "Roof Details"}
              {step === 5 && "Timeline"}
              {step === 6 && "Final Details"}
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              {step === 1 && "We need a few details to get you the right expert."}
              {step === 2 && "This helps us prioritize emergency crews."}
              {step === 3 && "This ensures we send the right paperwork."}
              {step === 6 && "Where should we send your quote?"}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Service Needed</label>
                  <select {...register("serviceType")} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-0 outline-none transition text-slate-800 text-lg">
                    <option value="Replacement">Full Replacement</option>
                    <option value="Storm Damage">Storm Damage / Insurance</option>
                    <option value="Repair">Small Repair</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Property Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <SelectionCard selected={watch("propertyType") === "Residential"} onClick={() => setValue("propertyType", "Residential")}>Residential</SelectionCard>
                    <SelectionCard selected={watch("propertyType") === "Commercial"} onClick={() => setValue("propertyType", "Commercial")}>Commercial</SelectionCard>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">ZIP Code</label>
                  <input {...register("zipCode")} placeholder="e.g. 77001" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-lg" />
                  {errors.zipCode && <p className="text-red-500 text-sm mt-1 ml-1">Please enter a valid zip code.</p>}
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div
                  onClick={() => setValue("activeLeak", !watch("activeLeak"))}
                  className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${watch("activeLeak") ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded border flex items-center justify-center mr-4 ${watch("activeLeak") ? "bg-red-500 border-red-500" : "border-slate-300 bg-white"}`}>
                      {watch("activeLeak") && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-xl font-medium ${watch("activeLeak") ? "text-red-900" : "text-slate-700"}`}>Yes, water is currently entering the home.</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm text-center">Leave unchecked if dry.</p>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && renderFundingOptions()}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Roof Steepness</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Flat", "Low Slope", "Steep", "Very Steep"].map(opt => (
                      <SelectionCard
                        key={opt}
                        selected={watch("roofSteepness") === opt}
                        onClick={() => setValue("roofSteepness", opt as any)}
                        className="py-3 text-sm"
                      >
                        {opt}
                      </SelectionCard>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Building Height</label>
                  <div className="flex gap-3">
                    {["1", "2", "3+"].map(opt => (
                      <SelectionCard
                        key={opt}
                        selected={watch("stories") === opt}
                        onClick={() => setValue("stories", opt as any)}
                        className="flex-1 text-center justify-center"
                      >
                        {opt} Story
                      </SelectionCard>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <div className="grid grid-cols-1 gap-3 animate-fade-in">
                {["ASAP", "1-3 Months", "3+ Months", "Just Researching"].map((opt) => (
                  <SelectionCard
                    key={opt}
                    selected={watch("timeline") === opt}
                    onClick={() => setValue("timeline", opt as any)}
                  >
                    {opt}
                  </SelectionCard>
                ))}
              </div>
            )}

            {/* STEP 6 */}
            {step === 6 && (
              <div className="space-y-4 animate-fade-in">
                <input {...register("fullName")} placeholder="Full Name" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-lg" />
                <input {...register("phone")} placeholder="(555) 123-4567" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-lg" />
                <input {...register("email")} type="email" placeholder="email@address.com" className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-lg" />

                <div className="flex items-start pt-2">
                  <input type="checkbox" {...register("consent")} className="mt-1 h-5 w-5 text-sky-600 rounded border-gray-300 focus:ring-sky-500" />
                  <p className="ml-3 text-sm text-slate-500 leading-relaxed">
                    I agree to receive text messages and emails for the purpose of a quote. I can opt-out at any time.
                  </p>
                </div>
                {errors.consent && <p className="text-red-500 text-sm">You must agree to continue.</p>}
              </div>
            )}

            {/* CONTROLS */}
            <div className="pt-8 flex items-center justify-between">
              {step > 1 ? (
                <button type="button" onClick={prevStep} className="text-slate-400 hover:text-slate-600 font-semibold px-4 py-2 transition">
                  Back
                </button>
              ) : <div></div>}

              {step < totalSteps ? (
                <button type="button" onClick={nextStep} className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-sky-200 transition-all transform hover:-translate-y-1 flex items-center">
                  Next Step <ArrowRight />
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-sky-200 transition-all transform hover:-translate-y-1 flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? "Processing..." : "Get My Quote"}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>

      <div className="mt-8 text-slate-400 text-sm">
        🔒 Secure SSL Connection
      </div>
    </main>
  );
}