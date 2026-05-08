import { Resend } from "resend";
import { env } from "../env";

export async function sendApprovalEmail(
  agentName: string,
  agentId: string,
  approvalToken: string,
) {
  const resend = new Resend(env.RESEND_API_KEY);
  const approvalUrl = `${env.APPROVAL_BASE_URL}/api/agents/${agentId}/approve?token=${approvalToken}`;

  await resend.emails.send({
    from: env.APPROVAL_EMAIL_FROM,
    to: env.APPROVAL_EMAIL_TO,
    subject: `Agent "${agentName}" requests approval — Anban`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h2 style="margin: 0 0 1rem;">New agent registration</h2>
        <p style="margin: 0 0 0.5rem; color: #555;">
          Agent <strong>${agentName}</strong> has registered and is waiting for approval.
        </p>
        <a href="${approvalUrl}"
           style="display: inline-block; padding: 0.75rem 1.5rem; background: #22d3ee; color: #000; text-decoration: none; border-radius: 6px; margin: 1rem 0;">
          Approve ${agentName}
        </a>
        <p style="margin: 1rem 0 0; color: #888; font-size: 0.875rem;">
          Or copy this link: ${approvalUrl}
        </p>
      </div>
    `,
  });
}
