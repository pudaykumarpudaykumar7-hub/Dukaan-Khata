/* Dukaan Khata subscription catalogue.
 * Public plan definitions only. Never use this file as proof of payment or
 * as the security boundary for feature limits; enforce entitlements server-side.
 */
(function (root) {
  "use strict";

  const plans = Object.freeze([
    Object.freeze({
      id: "free",
      name: "Starter",
      pricePaise: 0,
      currency: "INR",
      interval: "month",
      customerLimit: 50,
      billLimit: 500,
      unlimitedCustomers: false,
      unlimitedBills: false,
      description: "A simple start for small shops"
    }),
    Object.freeze({
      id: "basic-50",
      name: "Pro",
      pricePaise: 5000,
      currency: "INR",
      interval: "month",
      customerLimit: 100,
      billLimit: 1500,
      unlimitedCustomers: false,
      unlimitedBills: false,
      description: "More room for growing shops"
    }),
    Object.freeze({
      id: "plus-100",
      name: "Premium",
      pricePaise: 10000,
      currency: "INR",
      interval: "month",
      customerLimit: 200,
      billLimit: 2500,
      unlimitedCustomers: false,
      unlimitedBills: false,
      description: "For busy shops managing more customers"
    }),
    Object.freeze({
      id: "unlimited-149",
      name: "Ultra Premium",
      pricePaise: 14900,
      currency: "INR",
      interval: "month",
      customerLimit: null,
      billLimit: null,
      unlimitedCustomers: true,
      unlimitedBills: true,
      description: "Unlimited customers and bills"
    })
  ]);

  const byId = (id) => plans.find((plan) => plan.id === id) || null;
  const isWithinLimit = (plan, usage) => {
    if (!plan || !usage) return false;
    const customersOk = plan.unlimitedCustomers ||
      (Number.isFinite(usage.customers) && usage.customers < plan.customerLimit);
    const billsOk = plan.unlimitedBills ||
      (Number.isFinite(usage.billsThisMonth) && usage.billsThisMonth < plan.billLimit);
    return customersOk && billsOk;
  };

  root.DukaanKhataSubscriptions = Object.freeze({ plans, byId, isWithinLimit });
})(typeof window !== "undefined" ? window : globalThis);
