/**
 * Notification Service
 *
 * Handles email and webhook notifications for wallet events:
 * - Recovery request initiated
 * - Guardian approval received
 * - Recovery executed / cancelled
 * - Wallet frozen / unfrozen
 *
 * Currently supports: console logging (dev), SendGrid (production).
 * Extend by adding SMTP or webhook providers below.
 */

import { logger } from "../utils/logger";

export type NotificationEvent =
  | "recovery_initiated"
  | "recovery_approved"
  | "recovery_executed"
  | "recovery_cancelled"
  | "wallet_frozen"
  | "wallet_unfrozen"
  | "guardian_added"
  | "guardian_removed"
  | "proposal_created"
  | "proposal_executed";

export interface NotificationPayload {
  event: NotificationEvent;
  walletAddress: string;
  recipientEmail?: string;
  data?: Record<string, unknown>;
}

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "none";

// ─── Email templates ──────────────────────────────────────────

const TEMPLATES: Record<NotificationEvent, (data: Record<string, unknown>) => { subject: string; body: string }> = {
  recovery_initiated: (d) => ({
    subject: "⚠️ Recovery Request Initiated for Your Wallet",
    body: `A recovery request has been initiated for wallet ${d.walletAddress}.\n\nNew owner: ${d.newOwner}\n\nIf you did not initiate this, cancel it immediately from your wallet dashboard.\n\nThe request will be executable after ${d.executeAfter}.`,
  }),
  recovery_approved: (d) => ({
    subject: "✅ Guardian Approved Your Recovery Request",
    body: `Guardian ${d.guardian} has approved the recovery request for wallet ${d.walletAddress}.\n\nApprovals: ${d.approvals} / ${d.required}`,
  }),
  recovery_executed: (d) => ({
    subject: "🔄 Wallet Recovery Executed",
    body: `Ownership of wallet ${d.walletAddress} has been transferred to ${d.newOwner}.`,
  }),
  recovery_cancelled: (d) => ({
    subject: "❌ Recovery Request Cancelled",
    body: `The recovery request for wallet ${d.walletAddress} has been cancelled.`,
  }),
  wallet_frozen: (d) => ({
    subject: "🔒 Your Wallet Has Been Frozen",
    body: `Wallet ${d.walletAddress} has been frozen at ${d.frozenAt}. All outgoing transactions are suspended.`,
  }),
  wallet_unfrozen: (d) => ({
    subject: "🔓 Your Wallet Has Been Unfrozen",
    body: `Wallet ${d.walletAddress} has been unfrozen and is now active.`,
  }),
  guardian_added: (d) => ({
    subject: "👤 New Guardian Added",
    body: `Guardian ${d.guardian} has been added to wallet ${d.walletAddress}.`,
  }),
  guardian_removed: (d) => ({
    subject: "👤 Guardian Removed",
    body: `Guardian ${d.guardian} has been removed from wallet ${d.walletAddress}.`,
  }),
  proposal_created: (d) => ({
    subject: "📋 New Multi-Sig Proposal",
    body: `A new multi-sig proposal has been created for wallet ${d.walletAddress}.\n\nProposal ID: ${d.proposalId}\nAmount: ${d.amount} ${d.asset}\nDestination: ${d.destination}`,
  }),
  proposal_executed: (d) => ({
    subject: "✅ Multi-Sig Proposal Executed",
    body: `Proposal ${d.proposalId} for wallet ${d.walletAddress} has been executed.`,
  }),
};

// ─── Send notification ────────────────────────────────────────

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const { event, walletAddress, recipientEmail, data = {} } = payload;
  const templateData = { walletAddress, ...data };
  const template = TEMPLATES[event](templateData);

  logger.info(`[Notification] ${event} for ${walletAddress}`, {
    event,
    walletAddress,
    subject: template.subject,
  });

  if (!recipientEmail || EMAIL_PROVIDER === "none") {
    // Dev mode: log only
    logger.debug(`[Notification] Would send to ${recipientEmail ?? "no email"}: ${template.subject}`);
    return;
  }

  if (EMAIL_PROVIDER === "sendgrid") {
    await sendViaSendGrid(recipientEmail, template.subject, template.body);
    return;
  }

  if (EMAIL_PROVIDER === "smtp") {
    await sendViaSmtp(recipientEmail, template.subject, template.body);
    return;
  }
}

// ─── SendGrid provider ────────────────────────────────────────

async function sendViaSendGrid(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@recovery-wallet.example.com";

  if (!apiKey) {
    logger.warn("SENDGRID_API_KEY not set — skipping email");
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!response.ok) {
    logger.error(`SendGrid error: ${response.status} ${response.statusText}`);
  }
}

// ─── SMTP provider (stub) ─────────────────────────────────────

async function sendViaSmtp(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // Install nodemailer and implement if needed:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from, to, subject, text: body });
  logger.info(`[SMTP stub] Would send "${subject}" to ${to}`);
}

// ─── Webhook dispatcher ───────────────────────────────────────

export async function dispatchWebhook(
  webhookUrl: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: payload.event,
        walletAddress: payload.walletAddress,
        data: payload.data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      logger.warn(`Webhook delivery failed: ${response.status}`);
    }
  } catch (err) {
    logger.error("Webhook dispatch error:", err);
  }
}
