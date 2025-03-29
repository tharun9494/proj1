import React from 'react';
import { motion } from 'framer-motion';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
            
            <div className="prose prose-red max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-600 mb-4">
                  By accessing and placing an order with Pitta's Bawarchi, you confirm that you are in agreement with and bound by the terms and conditions contained herein.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Ordering and Payment</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>All orders are subject to availability and confirmation of the order price.</li>
                  <li>Prices are subject to change without notice.</li>
                  <li>Payment must be made in full at the time of ordering.</li>
                  <li>We accept payments through various methods as indicated on our platform.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Cancellation and Refund Policy</h2>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Cancellation:</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Orders can be cancelled within 5 minutes of placing the order at no cost.</li>
                  <li>Orders cannot be cancelled once the food preparation has begun.</li>
                  <li>For party orders or bulk orders, cancellation must be made at least 24 hours in advance.</li>
                  <li>Cancellation charges may apply:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>0-5 minutes: No charges</li>
                      <li>5-10 minutes: 25% of order value</li>
                      <li>After food preparation begins: No refund</li>
                    </ul>
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">Refunds:</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Refund processing timeline:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>UPI/Mobile Wallets: 1-3 business days</li>
                      <li>Credit/Debit Cards: 5-7 business days</li>
                      <li>Net Banking: 3-5 business days</li>
                    </ul>
                  </li>
                  <li>Full refund will be provided in cases of:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Order cancellation before preparation</li>
                      <li>Restaurant unable to fulfill order</li>
                      <li>Food quality issues with valid proof</li>
                    </ul>
                  </li>
                  <li>Partial refunds may be offered for incomplete orders or quality issues.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Delivery Policy</h2>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Delivery Timelines:</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>Standard delivery times:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Minimum: 30-45 minutes</li>
                      <li>Maximum: 60-75 minutes</li>
                      <li>Peak hours may extend delivery by 15-20 minutes</li>
                    </ul>
                  </li>
                  <li>Bulk orders and party orders:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Minimum advance notice: 4 hours</li>
                      <li>Recommended advance notice: 24 hours</li>
                    </ul>
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-gray-800 mb-2">Delivery Terms:</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Minimum order value for free delivery: ₹299</li>
                  <li>Delivery charges:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>0-3 km: ₹30</li>
                      <li>3-5 km: ₹50</li>
                      <li>5-7 km: ₹70</li>
                      <li>Beyond 7 km: Delivery not available</li>
                    </ul>
                  </li>
                  <li>Additional terms:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Live tracking available for all orders</li>
                      <li>Contactless delivery available on request</li>
                      <li>Delivery partner tips are optional and voluntary</li>
                    </ul>
                  </li>
                  <li>Delivery may be affected during:
                    <ul className="list-circle pl-6 mt-2 space-y-1">
                      <li>Adverse weather conditions</li>
                      <li>Local restrictions or curfews</li>
                      <li>Peak hours (1-3 PM and 7-9 PM)</li>
                    </ul>
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Quality Assurance</h2>
                <p className="text-gray-600 mb-4">
                  We maintain high standards of quality and food safety. However, if you are unsatisfied with our service, please contact our customer support immediately.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Account Registration</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>You must register an account to place orders.</li>
                  <li>You are responsible for maintaining the confidentiality of your account.</li>
                  <li>You must provide accurate and complete information during registration.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Modifications</h2>
                <p className="text-gray-600 mb-4">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
                <p className="text-gray-600">
                  For any questions about these Terms and Conditions, please contact us at:<br />
                  Email: support@pittasbawarchi.com<br />
                  Phone: +91 98765 43210
                </p>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;