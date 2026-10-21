const EMAIL_FROM = process.env.EMAIL_FROM || "people@plannorium.com";
const HR_EMAIL = process.env.HR_EMAIL || "hr@plannorium.com";

export interface SendReminderParams {
  toEmail: string;
  recipientName?: string;
  type: "complete_onboarding" | "review_profile";
}

export interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Send onboarding or profile review reminder emails through Resend (RESEND_API_KEY).
 * Without a key, development logs the message instead; production reports the failure
 * rather than pretending the email went out.
 */
export async function sendReminderEmail(params: SendReminderParams): Promise<SendResult> {
  const isCompleteReminder = params.type === "complete_onboarding";
  const subject = isCompleteReminder
    ? "Action required: complete your Plannorium People profile"
    : "Periodic review: please check your Plannorium People profile";

  const appUrl = (process.env.NEXTAUTH_URL || "https://people.plannorium.com").replace(/\/+$/, "");
  const actionUrl = isCompleteReminder ? `${appUrl}/onboarding/personal` : `${appUrl}/onboarding/review`;

  const greeting = params.recipientName ? `Hi ${params.recipientName},` : "Hi,";
  const text = [
    greeting,
    "",
    isCompleteReminder
      ? "Your Plannorium People profile isn't finished yet. It holds the emergency contacts HR would call if you needed help at work, so please take a few minutes to complete it."
      : "It's time for your periodic profile review. Please confirm that your emergency contacts and home address are still correct.",
    "",
    actionUrl,
    "",
    `Questions? Reply to this email or contact ${HR_EMAIL}.`,
    "",
    "Plannorium People",
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Email delivery is not configured (RESEND_API_KEY is missing)." };
    }
    // Recipient address left out of logs on purpose
    console.log(`[Email Dispatch:dev] Subject: "${subject}" | Action: ${actionUrl}`);
    return { success: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.toEmail],
        reply_to: HR_EMAIL,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error("[Email Dispatch] Provider rejected message with status", res.status);
      return { success: false, error: "The email provider rejected the message." };
    }
    return { success: true };
  } catch (err) {
    console.error("[Email Dispatch] Network error:", (err as Error).message);
    return { success: false, error: "Could not reach the email provider." };
  }
}
