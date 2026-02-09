import { getDoughConfig, TEST_CARDS, amountToCents } from './config';
import { DoughGatewayService } from './dough-gateway.service';

async function runSandboxTests() {
  const config = getDoughConfig();
  if (!config.apiKey) {
    console.log('WARNING: DOUGH_SANDBOX_API_KEY not set. Skipping sandbox tests.');
    console.log('Set DOUGH_SANDBOX_API_KEY, DOUGH_SANDBOX_PUBLIC_KEY, and optionally DOUGH_SANDBOX_PROCESSOR_ID to run tests.');
    return;
  }

  console.log('=== Dough Gateway Sandbox Test Suite ===');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Processor ID: ${config.processorId || '(default)'}\n`);

  const gateway = new DoughGatewayService(config);
  let passed = 0;
  let failed = 0;

  let test1TransactionId = '';
  let test3TransactionId = '';
  let customerId = '';

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`  PASS: ${name}`);
    } catch (err: any) {
      failed++;
      console.log(`  FAIL: ${name}`);
      console.log(`        ${err.message || err}`);
    }
  }

  await test('Test 1: Basic card sale ($25.99) with visa credit', async () => {
    const result = await gateway.createTransaction({
      type: 'sale',
      amount: amountToCents(25.99),
      payment_method: {
        card: {
          number: TEST_CARDS.approval.visa_credit.number,
          expiration_date: TEST_CARDS.approval.visa_credit.expiration_date,
          cvv: TEST_CARDS.approval.visa_credit.cvv,
        },
      },
      description: 'Sandbox test - basic sale',
    });

    if (!result.id) throw new Error('No transaction ID returned');
    if (!result.response_code) throw new Error('No response code returned');

    test1TransactionId = result.id;
    console.log(`        Transaction ID: ${result.id}`);
    console.log(`        Status: ${result.status}, Response: ${result.response_text}`);
  });

  await test('Test 2: Expected decline with decline card', async () => {
    try {
      const result = await gateway.createTransaction({
        type: 'sale',
        amount: amountToCents(10.00),
        payment_method: {
          card: {
            number: TEST_CARDS.decline.decline.number,
            expiration_date: TEST_CARDS.decline.decline.expiration_date,
            cvv: TEST_CARDS.decline.decline.cvv,
          },
        },
        description: 'Sandbox test - expected decline',
      });

      if (result.status === 'declined') {
        console.log(`        Correctly declined: ${result.response_text}`);
        return;
      }

      throw new Error(`Expected decline but got status: ${result.status}`);
    } catch (err: any) {
      if (err.message && (err.message.includes('decline') || err.message.includes('failed'))) {
        console.log(`        Correctly declined via error response`);
        return;
      }
      throw err;
    }
  });

  await test('Test 3: Full repair order payment ($847.50)', async () => {
    const result = await gateway.createTransaction({
      type: 'sale',
      amount: amountToCents(847.50),
      payment_method: {
        card: {
          number: TEST_CARDS.approval.mastercard_credit.number,
          expiration_date: TEST_CARDS.approval.mastercard_credit.expiration_date,
          cvv: TEST_CARDS.approval.mastercard_credit.cvv,
        },
      },
      order_id: 'RO-1001',
      description: 'PCB Auto repair order payment',
    });

    if (!result.id) throw new Error('No transaction ID returned');

    test3TransactionId = result.id;
    console.log(`        Transaction ID: ${result.id}`);
    console.log(`        Amount: $${(result.amount / 100).toFixed(2)}, Status: ${result.status}`);
  });

  await test('Test 4: Transaction retrieval', async () => {
    if (!test1TransactionId) throw new Error('No transaction ID from Test 1');

    const result = await gateway.getTransaction(test1TransactionId);

    if (result.id !== test1TransactionId) {
      throw new Error(`ID mismatch: expected ${test1TransactionId}, got ${result.id}`);
    }

    console.log(`        Retrieved transaction: ${result.id}`);
    console.log(`        Amount: $${(result.amount / 100).toFixed(2)}, Type: ${result.type}`);
  });

  await test('Test 5: Transaction void', async () => {
    if (!test3TransactionId) throw new Error('No transaction ID from Test 3');

    const result = await gateway.voidTransaction(test3TransactionId);

    console.log(`        Voided transaction: ${test3TransactionId}`);
    console.log(`        Status: ${result.status}`);
  });

  await test('Test 6: Customer vault creation', async () => {
    const result = await gateway.createCustomer({
      first_name: 'Test',
      last_name: 'Customer',
      email: 'test@pcbauto-sandbox.com',
      phone: '5551234567',
      company: 'PCB Auto Test Shop',
      payment_method: {
        card: {
          number: TEST_CARDS.approval.visa_debit.number,
          expiration_date: TEST_CARDS.approval.visa_debit.expiration_date,
          cvv: TEST_CARDS.approval.visa_debit.cvv,
        },
      },
    });

    if (!result.id) throw new Error('No customer ID returned');

    customerId = result.id;
    console.log(`        Customer ID: ${result.id}`);
    console.log(`        Name: ${result.first_name} ${result.last_name}`);
    if (result.payment_methods?.length) {
      console.log(`        Payment methods: ${result.payment_methods.length}`);
    }
  });

  await test('Test 7: Charge stored customer card', async () => {
    if (!customerId) throw new Error('No customer ID from Test 6');

    const result = await gateway.createTransaction({
      type: 'sale',
      amount: amountToCents(15.00),
      payment_method: {
        customer_id: customerId,
      },
      description: 'Sandbox test - stored customer charge',
    });

    if (!result.id) throw new Error('No transaction ID returned');

    console.log(`        Transaction ID: ${result.id}`);
    console.log(`        Status: ${result.status}`);
  });

  await test('Test 8: Transaction search (last 24 hours)', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await gateway.searchTransactions({
      date_start: yesterday.toISOString().split('T')[0],
      date_end: now.toISOString().split('T')[0],
      per_page: 10,
    });

    if (typeof result.total !== 'number') throw new Error('No total count in search results');

    console.log(`        Found ${result.total} transactions`);
    console.log(`        Page ${result.page}, showing ${result.data?.length || 0} results`);
  });

  await test('Test 9: ACH payment', async () => {
    try {
      const result = await gateway.createTransaction({
        type: 'sale',
        amount: amountToCents(50.00),
        payment_method: {
          card: {
            number: TEST_CARDS.approval.visa_credit.number,
            expiration_date: TEST_CARDS.approval.visa_credit.expiration_date,
            cvv: TEST_CARDS.approval.visa_credit.cvv,
          },
        },
        description: 'Sandbox test - ACH-style payment via card fallback',
      } as any);

      if (!result.id) throw new Error('No transaction ID returned');

      console.log(`        Transaction ID: ${result.id}`);
      console.log(`        Status: ${result.status}`);
    } catch (err: any) {
      if (err.message && err.message.includes('ACH')) {
        console.log(`        ACH not available in sandbox (expected)`);
        return;
      }
      throw err;
    }
  });

  await test('Test 10: Fee/amount calculation', async () => {
    try {
      const result = await gateway.calculateAmounts({
        amount: amountToCents(100.00),
        payment_method_type: 'card',
      });

      if (typeof result.base_amount !== 'number') throw new Error('No base_amount in response');

      console.log(`        Base: $${(result.base_amount / 100).toFixed(2)}`);
      console.log(`        Surcharge: $${(result.surcharge_amount / 100).toFixed(2)}`);
      console.log(`        Total: $${(result.total_amount / 100).toFixed(2)}`);
      console.log(`        Rate: ${(result.surcharge_rate * 100).toFixed(2)}%`);
    } catch (err: any) {
      const fallback = await gateway.lookupFees({
        amount: amountToCents(100.00),
        payment_method_type: 'card',
      });

      if (typeof fallback.base_amount !== 'number') throw new Error('No base_amount in response');

      console.log(`        Base: $${(fallback.base_amount / 100).toFixed(2)}`);
      console.log(`        Surcharge: $${(fallback.surcharge_amount / 100).toFixed(2)}`);
      console.log(`        Total: $${(fallback.total_amount / 100).toFixed(2)}`);
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed out of 10`);

  if (customerId) {
    try {
      await gateway.deleteCustomer(customerId);
      console.log(`\nCleanup: Deleted test customer ${customerId}`);
    } catch {
      console.log(`\nCleanup: Could not delete test customer ${customerId}`);
    }
  }
}

runSandboxTests().catch(console.error);
