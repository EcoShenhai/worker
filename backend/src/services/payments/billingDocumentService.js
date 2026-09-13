'use strict';

const { sequelize, Invoice, Receipt, Tenant, User } = require('../../models');
const { PLANS } = require('./subscriptionService');

function pad(n) {
  return String(n).padStart(6, '0');
}

async function nextNumber(sequenceName, prefix) {
  const [rows] = await sequelize.query(
    `SELECT nextval('${sequenceName}') AS n`
  );

  const number = Number(rows[0].n);
  return `${prefix}-${new Date().getFullYear()}-${pad(number)}`;
}

async function createForSubscriptionPayment(payment) {
  if (!payment || payment.status !== 'completed') return null;
  if (!payment.tenantId) return null;
  if (!payment.metadata || payment.metadata.type !== 'subscription') return null;

  const plan = payment.metadata.plan;
  if (!PLANS[plan]) return null;

  const tenant = await Tenant.findByPk(payment.tenantId);
  if (!tenant) return null;

  const user = payment.initiatedById
    ? await User.findByPk(payment.initiatedById)
    : null;

  const customerName = tenant.name || user?.name || 'Worker customer';
  const customerEmail = user?.email || null;
  const customerDepartment = user?.department || null;
  const description = `Worker ${plan} subscription`;

  const expectedCurrency = payment.provider === 'mpesa' ? 'KES' : 'USD';
  const expectedAmount = payment.provider === 'mpesa'
    ? PLANS[plan].kes
    : PLANS[plan].usd;

  if (String(payment.currency).toUpperCase() !== expectedCurrency) return null;
  if (Number(payment.amount) !== expectedAmount) return null;

  const [invoice] = await Invoice.findOrCreate({
    where: { paymentId: payment.id },
    defaults: {
      tenantId: payment.tenantId,
      paymentId: payment.id,
      invoiceNumber: await nextNumber('invoice_number_seq', 'INV'),
      status: 'issued',
      issueDate: payment.createdAt || new Date(),
      dueDate: payment.createdAt || new Date(),
      currency: payment.currency,
      subtotal: payment.amount,
      taxAmount: 0,
      totalAmount: payment.amount,
      customerName,
      customerEmail,
      customerDepartment,
      customerReference: null,
      taxPin: null,
      description,
      items: [
        {
          description,
          quantity: 1,
          unitPrice: Number(payment.amount),
          amount: Number(payment.amount),
        },
      ],
      metadata: {
        documentVersion: 1,
        plan,
        paymentProvider: payment.provider,
      },
    },
  });

  const [receipt] = await Receipt.findOrCreate({
    where: { paymentId: payment.id },
    defaults: {
      tenantId: payment.tenantId,
      paymentId: payment.id,
      invoiceId: invoice.id,
      receiptNumber: await nextNumber('receipt_number_seq', 'RCT'),
      status: 'issued',
      receiptDate: payment.updatedAt || payment.createdAt || new Date(),
      provider: payment.provider,
      providerReference: payment.providerRef || null,
      providerReceipt: payment.providerReceipt || null,
      currency: payment.currency,
      amount: payment.amount,
      payerReference: payment.payerRef || null,
      customerName,
      description,
      metadata: {
        documentVersion: 1,
        plan,
        paymentProvider: payment.provider,
      },
    },
  });

  return { invoice, receipt };
}

module.exports = { createForSubscriptionPayment };
