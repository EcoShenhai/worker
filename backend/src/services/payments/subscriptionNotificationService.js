'use strict';

const emailService = require('../email/emailService');
const logger = require('../../utils/logger');

function formatAmount(amount, currency) {
  return `${currency} ${Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return '[TO BE CONFIRMED]';

  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  });
}

async function sendSubscriptionPaymentNotification(
  payment,
  invoice,
  receipt,
  tenant
) {
  if (!payment || payment.status !== 'completed') return null;
  if (!invoice || !receipt) return null;

  const email = invoice.customerEmail;

  if (!email) {
    logger.warn('Subscription payment notification skipped: no customer email', {
      paymentId: payment.id,
    });
    return null;
  }

  if (payment.notificationSentAt) {
    return null;
  }

  const plan = payment.metadata?.plan || '[TO BE CONFIRMED]';

  const subject =
    `Worker subscription payment received — ${receipt.receiptNumber}`;

  const body = [
    `Dear ${invoice.customerName},`,
    '',
    'Your Worker subscription payment has been received successfully.',
    '',
    `Organisation: ${invoice.customerName}`,
    `Plan: ${String(plan).charAt(0).toUpperCase()}${String(plan).slice(1)}`,
    `Amount: ${formatAmount(payment.amount, payment.currency)}`,
    `Payment provider: ${payment.provider === 'mpesa' ? 'M-Pesa' : 'PayPal'}`,
    `Provider receipt: ${receipt.providerReceipt || '[NOT PROVIDED]'}`,
    `Payment reference: ${receipt.providerReference || '[NOT PROVIDED]'}`,
    `Invoice: ${invoice.invoiceNumber}`,
    `Receipt: ${receipt.receiptNumber}`,
    '',
    `Subscription ends: ${formatDate(tenant?.subscriptionEndsAt)}`,
    '',
    'Your invoice and receipt are available in Worker under Admin → Billing.',
    '',
    'Thank you for using Worker.',
    '',
    'Worker',
    'Shenhai Enterprises Limited',
  ].join('\n');

  const result = await emailService.sendTransactional({
    to: email,
    subject,
    body,
  });

  payment.notificationSentAt = new Date();
  await payment.save();

  logger.info('Subscription payment notification recorded', {
    paymentId: payment.id,
    invoiceId: invoice.id,
    receiptId: receipt.id,
    messageId: result.messageId,
  });

  return result;
}

module.exports = { sendSubscriptionPaymentNotification };
