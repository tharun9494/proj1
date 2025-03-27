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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Delivery</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Delivery times are approximate and may vary.</li>
                  <li>Delivery charges are calculated based on the delivery location.</li>
                  <li>We reserve the right to refuse delivery to certain areas.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Cancellation and Refunds</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Orders can be cancelled within 5 minutes of placing the order.</li>
                  <li>Refunds will be processed within 5-7 business days.</li>
                  <li>Refund amount may vary based on the stage of order processing.</li>
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